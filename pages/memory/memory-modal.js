// memory-modal.js — modal de crear/editar fichero de memoria
'use strict';

function openModal(mem) {
    document.getElementById('memory-modal-title').textContent = mem ? t('memory.modal.title_edit') : t('memory.modal.title_new');
    document.getElementById('mem-filename').value = mem ? (mem.filename || '') : '';
    document.getElementById('mem-filename').readOnly = !!mem;
    document.getElementById('mem-content').value = mem ? (mem.content || '') : '';
    document.getElementById('memory-modal').style.display = 'flex';
    setTimeout(function () {
        (mem ? document.getElementById('mem-content') : document.getElementById('mem-filename')).focus();
    }, 60);
}

function closeModal() {
    document.getElementById('memory-modal').style.display = 'none';
}

async function saveMemory() {
    var filename = document.getElementById('mem-filename').value.trim();
    var content = document.getElementById('mem-content').value;
    if (!filename) { toast(t('memory.modal.filename_required'), 'error'); return; }
    if (!filename.endsWith('.md')) filename += '.md';
    var btn = document.getElementById('mem-save-btn');
    btn.disabled = true; btn.textContent = t('memory.modal.saving');
    try {
        await api.post('/api/memory', { filename: filename, content: content });
        toast(t('memory.modal.saved'), 'success');
        closeModal();
        await loadMemories();
    } catch (e) { toast(e.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = t('memory.modal.save_btn'); }
}
