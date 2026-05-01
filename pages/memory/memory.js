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

function bindEvents() {
    document.getElementById('btn-new-memory').addEventListener('click', function () {
        _editingFile = null;
        openModal(null);
    });

    document.getElementById('memory-modal-close').addEventListener('click', closeModal);
    document.getElementById('mem-cancel').addEventListener('click', closeModal);
    document.getElementById('memory-modal').addEventListener('click', function (e) {
        if (e.target.id === 'memory-modal') closeModal();
    });
    document.getElementById('mem-save-btn').addEventListener('click', saveMemory);

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

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });
}

init();
