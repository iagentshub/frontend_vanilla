// memory-render.js — renderizado de la cuadrícula de memoria
'use strict';

var _SVG_FILE  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '</svg>';
var _SVG_EDIT  = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
var _SVG_TRASH = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function renderGrid(memories, root) {
    root = root || document.getElementById('memory-grid');
    if (!memories.length) {
        root.innerHTML = '<div class="mem-empty">' + esc(t('memory.empty')) + '</div>';
        return;
    }
    root.innerHTML = memories.map(function (m) { return renderCard(m); }).join('');
}

function renderCard(m) {
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
        '<button class="mem-action mem-action--edit" data-action="edit" data-file="' + esc(m.filename) + '" title="' + esc(t('memory.actions.edit')) + '">' + _SVG_EDIT + '</button>' +
        '<button class="mem-action mem-action--delete" data-action="delete" data-file="' + esc(m.filename) + '" title="' + esc(t('memory.actions.delete')) + '">' + _SVG_TRASH + '</button>' +
        '</footer>' +
        '</article>';
}
