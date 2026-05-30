// memory.js — inicialización y eventos de la página de memoria
'use strict';

var _memories = [];
var _editingFile = null;

async function init() {
    await window.requireAuth();
    renderNav('nav-root', 'memory');
    FilterMemory.init({
        mountEl: '#filter-memory-root',
        onChange: _applyFilter,
    });
    await loadMemories();
    bindEvents();
}

async function loadMemories() {
    _memories = await api.get('/api/memory').catch(function () { return []; });
    _applyFilter();
}

function _applyFilter() {
    var f = FilterMemory.getFilter();
    var q = (f.query || '').toLowerCase();
    var filtered = q
        ? _memories.filter(function (m) { return m.filename.toLowerCase().indexOf(q) !== -1; })
        : _memories;
    renderGrid(filtered);
}

var _M_SVG_UPLOAD = '<svg width="15" height="15" viewBox="0 0 13 13" fill="none">'
    + '<path d="M6.5 8.5V1M3 4L6.5 1 10 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M1 10.5v1a.5.5 0 00.5.5h10a.5.5 0 00.5-.5v-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    + '</svg>';
var _M_SVG_PLUS = '<svg width="15" height="15" viewBox="0 0 13 13" fill="none">'
    + '<path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    + '</svg>';

function bindEvents() {
    document.getElementById('btn-new-memory').addEventListener('click', function () {
        ActionMenu.show(this, [
            { icon: _M_SVG_UPLOAD, label: t('memory.page.new_from_file'),    sub: t('memory.page.new_from_file_sub'),    steps: 2, onClick: function () { document.getElementById('memory-file-input').click(); } },
            { icon: _M_SVG_PLUS,   label: t('memory.page.new_from_scratch'), sub: t('memory.page.new_from_scratch_sub'), steps: 1, onClick: function () { _editingFile = null; openModal(null); } },
        ]);
    });

    document.getElementById('memory-file-input').addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var mem = _parseAndLoadMemory(file.name, ev.target.result);
                _editingFile = null;
                openModal(mem);
            } catch (err) {
                toast(t('memory.page.load_error', { msg: err.message }), 'error');
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('memory-modal-close').addEventListener('click', closeModal);
    document.getElementById('mem-cancel').addEventListener('click', closeModal);
    document.getElementById('mem-save-btn').addEventListener('click', saveMemory);

    if (window.i18n) {
        window.i18n.onLangChange(function () { _applyFilter(); });
    }

    document.getElementById('memory-grid').addEventListener('click', async function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var file = btn.dataset.file;
        if (btn.dataset.action === 'edit') {
            try {
                var mem = await api.get('/api/memory/' + encodeURIComponent(file));
                _editingFile = file;
                openModal({ filename: file, content: mem.content || '' });
            } catch (e) { toast(e.message, 'error'); }
        } else if (btn.dataset.action === 'delete') {
            if (!confirm(t('memory.confirm_delete', { file: file }))) return;
            try {
                await api.del('/api/memory/' + encodeURIComponent(file));
                toast(t('memory.deleted'), 'info');
                await loadMemories();
            } catch (e) { toast(e.message, 'error'); }
        }
    });

}

init();
