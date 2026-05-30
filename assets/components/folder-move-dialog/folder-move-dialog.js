// folder-move-dialog.js — modal compartido para mover items a carpeta
'use strict';

var FolderMoveDialog = (function () {
    var _section     = null;
    var _itemId      = null;
    var _currentFold = null;
    var _selectedId  = null; // null = sin carpeta
    var _onSuccess   = null;
    var _modal       = null;

    var _FOLDER_SVG = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">'
        + '<path d="M1.5 13V5a1 1 0 0 1 1-1h3.5l1.5-2H13a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
        + '</svg>';

    function _inject() {
        if (document.getElementById('fmd-modal')) return;
        var el = document.createElement('div');
        el.id = 'fmd-modal';
        el.className = 'modal-bg';
        el.style.display = 'none';
        el.innerHTML =
            '<div class="modal-box fmd-box">' +
            '<div class="modal-header">' +
            '<span class="modal-title" id="fmd-title">Mover a carpeta</span>' +
            '<button class="modal-close" id="fmd-close" type="button">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
            '</button>' +
            '</div>' +
            '<div class="modal-body">' +
            '<div id="fmd-list" class="fmd-list"></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-ghost" id="fmd-cancel">Cancelar</button>' +
            '<button class="btn btn-primary" id="fmd-confirm">Mover</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(el);
        _modal = el;

        el.addEventListener('click', function (e) {
            if (e.target === el) _close();
        });
        document.getElementById('fmd-close').addEventListener('click', _close);
        document.getElementById('fmd-cancel').addEventListener('click', _close);
        document.getElementById('fmd-confirm').addEventListener('click', _confirm);
    }

    function _renderList(folders) {
        var list = document.getElementById('fmd-list');
        if (!list) return;

        var items = [{ id: null, name: t('knowledge.folder.no_folder') || 'Sin carpeta' }]
            .concat(folders.map(function (f) { return { id: f.id, name: f.name }; }));

        list.innerHTML = items.map(function (f) {
            var active = f.id === _selectedId;
            return '<div class="fmd-item' + (active ? ' fmd-item--selected' : '') + '" data-fid="' + (f.id || '') + '">' +
                '<span class="fmd-item-dot"></span>' +
                (f.id ? _FOLDER_SVG : '') +
                '<span class="fmd-item-name">' + esc(f.name) + '</span>' +
                '</div>';
        }).join('');

        list.querySelectorAll('.fmd-item').forEach(function (item) {
            item.addEventListener('click', function () {
                _selectedId = item.dataset.fid || null;
                list.querySelectorAll('.fmd-item').forEach(function (i) {
                    i.classList.toggle('fmd-item--selected', i.dataset.fid === (item.dataset.fid || ''));
                });
            });
        });
    }

    function _apiUrl(section, itemId) {
        if (section === 'skill')    return '/api/skills/private/' + encodeURIComponent(itemId) + '/folder';
        if (section === 'agents')   return '/api/agents/' + encodeURIComponent(itemId) + '/folder';
        if (section === 'memory')   return '/api/memory/' + encodeURIComponent(itemId);
        return '/api/knowledge/' + encodeURIComponent(itemId);  // url, document
    }

    async function _confirm() {
        var btn = document.getElementById('fmd-confirm');
        btn.disabled = true;
        try {
            await api.patch(_apiUrl(_section, _itemId), { folder_id: _selectedId || null });
            _close();
            if (_onSuccess) _onSuccess(_selectedId);
        } catch (e) {
            if (typeof toast === 'function') toast(e.message || 'Error', 'error');
        } finally {
            btn.disabled = false;
        }
    }

    function _close() {
        if (_modal) _modal.style.display = 'none';
    }

    async function open(section, itemId, currentFolderId, onSuccess) {
        _inject();
        _section     = section;
        _itemId      = itemId;
        _currentFold = currentFolderId || null;
        _selectedId  = _currentFold;
        _onSuccess   = onSuccess || null;

        var list = document.getElementById('fmd-list');
        if (list) list.innerHTML = '<p class="fmd-loading">' + (t('knowledge.folder.loading') || 'Cargando…') + '</p>';

        _modal.style.display = '';

        try {
            var folders = await api.get('/api/knowledge/folders?section=' + section);
            _renderList(folders || []);
        } catch (e) {
            _renderList([]);
        }
    }

    return { open: open };
})();
