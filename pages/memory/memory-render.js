// memory-render.js — renderizado de la cuadrícula de memoria
'use strict';

function renderGrid(memories, root) {
    root = root || document.getElementById('memory-grid');
    if (!memories.length) {
        root.innerHTML = '<div class="empty-state"><p>' + t('memory.empty') + '</p></div>';
        return;
    }
    root.innerHTML = memories.map(function (m) { return renderCard(m); }).join('');
}

function renderCard(m) {
    var sizeLabel = m.size != null ? (m.size < 1024 ? m.size + ' B' : (m.size / 1024).toFixed(1) + ' KB') : '';
    return '<article class="card memory-card" data-file="' + esc(m.filename) + '">' +
        '<div class="card-body">' +
        '<div class="memory-filename">' + esc(m.filename) + '</div>' +
        (sizeLabel ? '<div class="memory-size">' + esc(sizeLabel) + '</div>' : '') +
        '</div>' +
        '<footer class="card-footer">' +
        '<button class="btn btn--ghost btn--sm" data-action="edit" data-file="' + esc(m.filename) + '">' + t('memory.actions.edit') + '</button>' +
        '<button class="btn btn--ghost btn--sm btn--danger" data-action="delete" data-file="' + esc(m.filename) + '">' + t('memory.actions.delete') + '</button>' +
        '</footer></article>';
}
