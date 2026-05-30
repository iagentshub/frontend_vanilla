'use strict';

function KnowledgeFolders(section, onSelect) {
    var _folders = [];
    var _activeId = null; // null = "Todos"
    var _stats = {};      // { folder_id: { count, chars } }
    var _totalCount = 0;
    var _totalChars = 0;

    var _panel = null;

    function _fmtChars(n) {
        if (!n) return '—';
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n + '';
    }

    function _render() {
        if (!_panel) return;
        var allStats = _stats['__all__'] || { count: _totalCount, chars: _totalChars };
        var html = '<div class="kf-section-header">' +
            '<span class="kf-section-label">Carpetas</span>' +
            '<button class="kf-add-btn" id="kf-add-' + section + '" title="Nueva carpeta">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
            '</button>' +
            '</div>' +
            '<button class="kf-item' + (_activeId === null ? ' kf-item--active' : '') + '" data-folder-id="">' +
            '<span class="kf-item-name">Todos</span>' +
            '<span class="kf-item-stats">' + allStats.count + ' · ' + _fmtChars(allStats.chars) + '</span>' +
            '</button>';

        _folders.forEach(function (f) {
            var s = _stats[f.id] || { count: 0, chars: 0 };
            var active = _activeId === f.id;
            html += '<div class="kf-item-row' + (active ? ' kf-item-row--active' : '') + '" data-folder-id="' + esc(f.id) + '">' +
                '<button class="kf-item' + (active ? ' kf-item--active' : '') + '" data-folder-id="' + esc(f.id) + '">' +
                '<span class="kf-item-name">' + esc(f.name) + '</span>' +
                '<span class="kf-item-stats">' + s.count + ' · ' + _fmtChars(s.chars) + '</span>' +
                '</button>' +
                '<div class="kf-item-actions">' +
                '<button class="kf-action-btn" data-action="rename" data-folder-id="' + esc(f.id) + '" title="Renombrar">' +
                '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>' +
                '</button>' +
                '<button class="kf-action-btn kf-action-btn--danger" data-action="delete" data-folder-id="' + esc(f.id) + '" title="Eliminar carpeta">' +
                '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2.5h4V4M6 7v5M10 7v5M4 4l.8 9.5h6.4L12 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</button>' +
                '</div>' +
                '</div>';
        });

        _panel.innerHTML = html;
        _bindEvents();
    }

    function _handleDrop(targetFolderId) {
        if (!window._kDrag || window._kDrag.section !== section) return;
        var itemId = window._kDrag.id;
        var req = section === 'skill'
            ? api.patch('/api/skills/private/' + encodeURIComponent(itemId) + '/folder', { folder_id: targetFolderId })
            : section === 'agents'
                ? api.patch('/api/agents/' + encodeURIComponent(itemId) + '/folder', { folder_id: targetFolderId || null })
                : section === 'memory'
                    ? api.patch('/api/memory/' + encodeURIComponent(itemId), { folder_id: targetFolderId || null })
                    : api.patch('/api/knowledge/' + encodeURIComponent(itemId), { folder_id: targetFolderId });
        req.then(function () { if (onSelect) onSelect(_activeId); })
           .catch(function (e) { if (typeof toast === 'function') toast(e.message, 'error'); });
    }

    function _bindEvents() {
        if (!_panel) return;

        _panel.querySelectorAll('.kf-item[data-folder-id]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.dataset.folderId || null;
                _activeId = id;
                _render();
                if (onSelect) onSelect(_activeId);
            });
            btn.addEventListener('dragover', function (e) {
                if (!window._kDrag || window._kDrag.section !== section) return;
                e.preventDefault();
                btn.classList.add('kd-drag-over');
            });
            btn.addEventListener('dragleave', function (e) {
                if (!btn.contains(e.relatedTarget)) btn.classList.remove('kd-drag-over');
            });
            btn.addEventListener('drop', function (e) {
                e.preventDefault();
                btn.classList.remove('kd-drag-over');
                _handleDrop(btn.dataset.folderId || null);
            });
        });

        var addBtn = _panel.querySelector('#kf-add-' + section);
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                var name = prompt('Nombre de la nueva carpeta:');
                if (!name || !name.trim()) return;
                api.post('/api/knowledge/folders', { section: section, name: name.trim() })
                    .then(function (f) {
                        _folders.push(f);
                        _render();
                    })
                    .catch(function (err) {
                        if (typeof toast === 'function') toast(err.message || 'Error al crear la carpeta', 'error');
                    });
            });
        }

        _panel.querySelectorAll('[data-action="rename"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var folderId = btn.dataset.folderId;
                var folder = _folders.find(function (f) { return f.id === folderId; });
                if (!folder) return;
                var name = prompt('Nuevo nombre:', folder.name);
                if (!name || !name.trim() || name.trim() === folder.name) return;
                api.patch('/api/knowledge/folders/' + folderId, { name: name.trim() })
                    .then(function (updated) {
                        folder.name = updated.name;
                        _render();
                    })
                    .catch(function (err) {
                        if (typeof toast === 'function') toast(err.message || 'Error al renombrar', 'error');
                    });
            });
        });

        _panel.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var folderId = btn.dataset.folderId;
                var folder = _folders.find(function (f) { return f.id === folderId; });
                if (!folder) return;
                if (!confirm('¿Eliminar la carpeta "' + folder.name + '"? Los items se moverán a la raíz.')) return;
                api.del('/api/knowledge/folders/' + folderId)
                    .then(function () {
                        _folders = _folders.filter(function (f) { return f.id !== folderId; });
                        if (_activeId === folderId) {
                            _activeId = null;
                            if (onSelect) onSelect(null);
                        }
                        _render();
                    })
                    .catch(function (err) {
                        if (typeof toast === 'function') toast(err.message || 'Error al eliminar', 'error');
                    });
            });
        });
    }

    function load() {
        if (window._navUserRole === 'guest') return;
        return api.get('/api/knowledge/folders?section=' + section)
            .then(function (data) {
                _folders = data || [];
                _render();
            })
            .catch(function () {});
    }

    function updateStats(items) {
        var byFolder = {};
        var total = { count: 0, chars: 0 };
        items.forEach(function (item) {
            total.count++;
            total.chars += item.char_count || 0;
            var fid = item.folder_id || '__root__';
            if (!byFolder[fid]) byFolder[fid] = { count: 0, chars: 0 };
            byFolder[fid].count++;
            byFolder[fid].chars += item.char_count || 0;
        });
        _stats = {};
        _folders.forEach(function (f) {
            _stats[f.id] = byFolder[f.id] || { count: 0, chars: 0 };
        });
        _totalCount = total.count;
        _totalChars = total.chars;
        _render();
    }

    function mount(panelEl) {
        _panel = panelEl;
        if (window._navUserRole === 'guest') {
            _panel.style.display = 'none';
            return;
        }
        _render();
    }

    function getActive() {
        return _activeId;
    }

    function getFolders() {
        return _folders;
    }

    return {
        load: load,
        mount: mount,
        getActive: getActive,
        getFolders: getFolders,
        updateStats: updateStats,
    };
}
