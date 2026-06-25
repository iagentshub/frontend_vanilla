// utils.js — utilidades generales
'use strict';

window.esc = function (s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

// Número de ítems por página; configurable en Preferencias del perfil.
window.getPageSize = function () {
    return Number(localStorage.getItem('ga-page-size')) || 24;
};

// Inserta (o actualiza) un botón "Ver N más" justo después de `container`.
// Llama a `onMore` cuando se hace clic. Elimina el botón si no hay más ítems.
window.renderLoadMore = function (container, total, shown, onMore) {
    var existing = container.nextElementSibling;
    if (existing && existing.classList.contains('load-more-row')) existing.remove();
    if (total <= shown) return;
    var remaining = total - shown;
    var row = document.createElement('div');
    row.className = 'load-more-row';
    var btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-sm load-more-btn';
    btn.textContent = (window.t && t('common.load_more'))
        ? t('common.load_more').replace('{n}', remaining)
        : 'Ver ' + remaining + ' más';
    btn.addEventListener('click', onMore);
    row.appendChild(btn);
    container.insertAdjacentElement('afterend', row);
};
