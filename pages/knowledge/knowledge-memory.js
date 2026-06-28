// knowledge-memory.js — gestión de memoria dentro de la página /knowledge
'use strict';

var KnowledgeMemory = (function () {
    var _memories = [];
    var _activeFolderId = null;
    var _editingFile = null;
    var _page = 1;
    var _query = '';

    var _SVG_FILE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        + '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
        + '<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
        + '</svg>';
    var _SVG_EDIT = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    var _SVG_TRASH = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var _SVG_FOLDER = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1.5 13V5a1 1 0 0 1 1-1h3.5l1.5-2H13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    var _SVG_UPLOAD = '<svg width="15" height="15" viewBox="0 0 13 13" fill="none">'
        + '<path d="M6.5 8.5V1M3 4L6.5 1 10 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
        + '<path d="M1 10.5v1a.5.5 0 00.5.5h10a.5.5 0 00.5-.5v-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
        + '</svg>';
    var _SVG_PLUS = '<svg width="15" height="15" viewBox="0 0 13 13" fill="none">'
        + '<path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
        + '</svg>';

    function init() {
        var btnNew = document.getElementById('btn-new-memory');
        if (btnNew) {
            btnNew.addEventListener('click', function () {
                ActionMenu.show(this, [
                    { icon: _SVG_UPLOAD, label: t('memory.page.new_from_file'),    sub: t('memory.page.new_from_file_sub'),    steps: 2, onClick: function () { document.getElementById('memory-file-input').click(); } },
                    { icon: _SVG_PLUS,   label: t('memory.page.new_from_scratch'), sub: t('memory.page.new_from_scratch_sub'), steps: 1, onClick: function () { _editingFile = null; _openModal(null); } },
                ]);
            });
        }

        var fileInput = document.getElementById('memory-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', function (e) {
                var file = e.target.files[0];
                if (!file) return;
                e.target.value = '';
                var reader = new FileReader();
                reader.onload = function (ev) {
                    try {
                        var mem = _parseFile(file.name, ev.target.result);
                        _editingFile = null;
                        _openModal(mem);
                    } catch (err) {
                        toast((t('memory.page.load_error') || 'Error: {{msg}}').replace('{{msg}}', err.message), 'error');
                    }
                };
                reader.readAsText(file);
            });
        }

        var closeBtn = document.getElementById('memory-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', _closeModal);
        var cancelBtn = document.getElementById('mem-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', _closeModal);
        var saveBtn = document.getElementById('mem-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', _saveMemory);

        var grid = document.getElementById('mem-grid');
        if (grid) {
            grid.addEventListener('click', async function (e) {
                var btn = e.target.closest('[data-action]');
                if (!btn) return;
                var file = btn.dataset.file;
                if (btn.dataset.action === 'edit') {
                    try {
                        var mem = await api.get('/api/memory/' + encodeURIComponent(file));
                        _editingFile = file;
                        _openModal({ filename: file, content: mem.content || '' });
                    } catch (err) { toast(err.message, 'error'); }
                } else if (btn.dataset.action === 'delete') {
                    if (!confirm((t('memory.confirm_delete') || '¿Eliminar {{file}}?').replace('{{file}}', file))) return;
                    try {
                        await api.del('/api/memory/' + encodeURIComponent(file));
                        toast(t('memory.deleted') || 'Eliminado', 'info');
                        load();
                    } catch (err) { toast(err.message, 'error'); }
                } else if (btn.dataset.action === 'move-memory') {
                    var memItem = _memories.find(function (m) { return m.filename === file; });
                    FolderMoveDialog.open('memory', file, memItem ? memItem.folder_id : null, function () { load(); });
                }
            });
        }
    }

    async function load(folderId) {
        if (folderId !== undefined) { _activeFolderId = folderId; _page = 1; }
        _memories = await api.get('/api/memory').catch(function () { return []; });
        _page = 1;
        _render();
        if (window._folderMemory) window._folderMemory.updateStats(_memories);
    }

    function _visibleMemories() {
        var items = _activeFolderId
            ? _memories.filter(function (m) { return m.folder_id === _activeFolderId; })
            : _memories;
        if (!_query) return items;
        var q = _query.toLowerCase();
        return items.filter(function (m) {
            return (m.filename || '').toLowerCase().indexOf(q) !== -1;
        });
    }

    function _render() {
        var grid = document.getElementById('mem-grid');
        if (!grid) return;
        var visible = _visibleMemories();
        if (!visible.length) {
            grid.innerHTML = '<div class="mem-empty">' + esc(t('memory.empty') || 'Sin archivos de memoria.') + '</div>';
            var old = grid.nextElementSibling;
            if (old && old.classList.contains('load-more-row')) old.remove();
            return;
        }
        var ps = getPageSize();
        var slice = visible.slice(0, _page * ps);
        grid.innerHTML = slice.map(function (m) {
            var sizeLabel = m.size != null
                ? (m.size < 1024 ? m.size + ' B' : (m.size / 1024).toFixed(1) + ' KB')
                : '';
            return '<article class="mem-card" data-file="' + esc(m.filename) + '">' +
                '<div class="mem-card-body" data-action="edit" data-file="' + esc(m.filename) + '">' +
                '<div class="mem-card-head">' +
                '<div class="mem-card-icon">' + _SVG_FILE + '</div>' +
                '<div class="mem-card-info">' +
                '<div class="mem-card-name">' + esc(m.filename) + '</div>' +
                (sizeLabel ? '<div class="mem-card-sub">' + esc(sizeLabel) + '</div>' : '') +
                '</div>' +
                '</div>' +
                '</div>' +
                '<footer class="mem-card-actions">' +
                '<button class="mem-action mem-action--edit" data-action="edit" data-file="' + esc(m.filename) + '" title="' + esc(t('memory.actions.edit') || 'Editar') + '">' + _SVG_EDIT + '</button>' +
                '<button class="mem-action" data-action="move-memory" data-file="' + esc(m.filename) + '" title="' + esc(t('knowledge.folder.move_to') || 'Mover a carpeta') + '">' + _SVG_FOLDER + '</button>' +
                '<button class="mem-action mem-action--delete" data-action="delete" data-file="' + esc(m.filename) + '" title="' + esc(t('memory.actions.delete') || 'Eliminar') + '">' + _SVG_TRASH + '</button>' +
                '</footer>' +
                '</article>';
        }).join('');
        renderLoadMore(grid, visible.length, _page * ps, function () { _page++; _render(); });
    }

    function _openModal(mem) {
        document.getElementById('memory-modal-title').textContent = mem ? t('memory.modal.title_edit') : t('memory.modal.title_new');
        var fnInput = document.getElementById('mem-filename');
        fnInput.value = mem ? (mem.filename || '').replace(/\.md$/, '') : '';
        fnInput.readOnly = !!mem;
        document.getElementById('mem-content').value = mem ? (mem.content || '') : '';
        document.getElementById('memory-modal').style.display = 'flex';
        setTimeout(function () {
            (mem ? document.getElementById('mem-content') : fnInput).focus();
        }, 60);
    }

    function _closeModal() {
        document.getElementById('memory-modal').style.display = 'none';
    }

    async function _saveMemory() {
        var filename = document.getElementById('mem-filename').value.trim();
        var content = document.getElementById('mem-content').value;
        if (!filename) { toast(t('memory.modal.filename_required') || 'El nombre es obligatorio', 'error'); return; }
        if (!filename.endsWith('.md')) filename += '.md';
        var btn = document.getElementById('mem-save-btn');
        btn.disabled = true;
        var origText = btn.textContent;
        btn.textContent = t('memory.modal.saving') || 'Guardando…';
        try {
            await api.post('/api/memory/' + encodeURIComponent(filename), { content: content });
            toast(t('memory.modal.saved') || 'Guardado', 'success');
            _closeModal();
            load();
        } catch (e) { toast(e.message, 'error'); }
        finally { btn.disabled = false; btn.textContent = origText; }
    }

    function _parseFile(filename, text) {
        if (filename.toLowerCase().endsWith('.json')) {
            var data = JSON.parse(text);
            return { filename: data.filename || filename.replace(/\.json$/i, ''), content: data.content || '' };
        }
        return { filename: filename.replace(/\.[^.]+$/, ''), content: text };
    }

    return {
        init: init, load: load,
        setQuery: function (q) { _query = q || ''; _page = 1; _render(); },
    };
})();
