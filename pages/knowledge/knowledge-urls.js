// knowledge-urls.js — gestión de URLs en la pestaña Conocimiento
'use strict';

var KnowledgeUrls = (function () {
    var _items = [];
    var _loaded = false;
    var _page = 1;
    var _query = '';

    function init() {
        document.getElementById('btn-add-url').addEventListener('click', _openModal);
        document.getElementById('url-modal-close').addEventListener('click', _closeModal);
        document.getElementById('url-modal-cancel').addEventListener('click', _closeModal);
        document.getElementById('url-modal-save').addEventListener('click', _submit);
        document.getElementById('url-input').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') _submit();
        });
        document.getElementById('urls-grid').addEventListener('click', function (e) {
            var shareBtn = e.target.closest('[data-share-id]');
            if (shareBtn) { window.GroupShareDialog && GroupShareDialog.open('knowledge', shareBtn.dataset.shareId, shareBtn.dataset.shareName || ''); return; }
            var delBtn = e.target.closest('[data-del-id]');
            if (delBtn) { _deleteItem(delBtn.dataset.delId); return; }
        });
    }

    async function load(folderId, groupId) {
        try {
            var url = '/api/knowledge?type=url';
            if (groupId) url += '&group_id=' + encodeURIComponent(groupId);
            _items = await api.get(url);
            _loaded = true;
        } catch (e) {
            _items = [];
        }
        _page = 1;
        _render();
    }

    function _visibleItems() {
        var items = _items;
        if (!_query) return items;
        var q = _query.toLowerCase();
        return items.filter(function (i) {
            return ((i.title || '') + ' ' + (i.source || '')).toLowerCase().indexOf(q) !== -1;
        });
    }

    function _render() {
        var grid = document.getElementById('urls-grid');
        if (!grid) return;
        var visible = _visibleItems();
        if (!visible.length) {
            grid.innerHTML = '<p class="knowledge-empty">' + (t('skills.knowledge.empty_urls') || 'Sin URLs todavía.') + '</p>';
            var old = grid.nextElementSibling;
            if (old && old.classList.contains('load-more-row')) old.remove();
            return;
        }
        var ps = getPageSize();
        var slice = visible.slice(0, _page * ps);
        grid.innerHTML = slice.map(function (item) {
            var warn = item.char_count > 8000
                ? '<span class="knowledge-warn" title="' + esc(t('skills.knowledge.char_warning') || 'Texto largo') + '">⚠</span>'
                : '';
            var _SHARE_SVG = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="12" cy="3" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="13" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="4" cy="8" r="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 3.8L5.5 7.2M10.5 12.2L5.5 8.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
            var shareBtn = !item._shared
                ? '<button class="knowledge-action-btn knowledge-action-btn--share" data-share-id="' + esc(item.id) + '" data-share-name="' + esc(item.title) + '" title="' + esc(t('teams.sharing.share_with') || 'Compartir con grupo') + '">' + _SHARE_SVG + '</button>'
                : '';
            // Badge de propiedad: siempre visible cuando es del usuario
            var ownerBadge = '';
            if (!item._shared) {
                // Es mío (propietario)
                ownerBadge = '<span class="label-chip" style="--lc:#059669">' +
                    esc(t('agents.origin.owner') || 'Propietario') + '</span>';
            } else if (window._activeGroupKnId) {
                // Compartido en grupo: mostrar quién lo compartió
                var ol = item.owner_id ? '@' + item.owner_id : (t('teams.sharing.shared_badge') || 'Compartido');
                ownerBadge = '<span class="res-badge res-badge--shared">' + esc(ol) + '</span>';
            }
            return '<div class="knowledge-card" draggable="true" data-drag-id="' + esc(item.id) + '" data-drag-section="url">' +
                '<div class="knowledge-card-header">' +
                '<span class="knowledge-card-icon">🔗</span>' +
                '<span class="knowledge-card-title">' + esc(item.title) + '</span>' +
                warn + ownerBadge +
                shareBtn +
                '<button class="knowledge-action-btn knowledge-action-btn--danger" data-del-id="' + esc(item.id) + '" title="' + esc(t('common.actions.delete') || 'Eliminar') + '"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
                '</div>' +
                '<a class="knowledge-card-source" href="' + esc(item.source) + '" target="_blank" rel="noopener">' + esc(item.source) + '</a>' +
                '<div class="knowledge-card-meta">' + esc(_fmtChars(item.char_count)) +
                '</div>' +
                '</div>';
        }).join('');
        renderLoadMore(grid, visible.length, _page * ps, function () { _page++; _render(); });
    }

    function _openModal() {
        document.getElementById('url-input').value = '';
        document.getElementById('url-title-input').value = '';
        document.getElementById('url-modal').style.display = 'flex';
        setTimeout(function () { document.getElementById('url-input').focus(); }, 60);
    }

    function _closeModal() {
        document.getElementById('url-modal').style.display = 'none';
    }

    async function _submit() {
        var url = document.getElementById('url-input').value.trim();
        var title = document.getElementById('url-title-input').value.trim();
        if (!url) return;
        var btn = document.getElementById('url-modal-save');
        btn.disabled = true;
        btn.textContent = t('skills.knowledge.fetching') || 'Obteniendo URL…';
        try {
            var item = await api.post('/api/knowledge/url', {
                url: url,
                title: title || url,
            });
            _items.unshift(item);
            _page = 1; _render();
            _closeModal();
            toast(item.title, 'success');
        } catch (e) {
            toast((t('skills.knowledge.fetch_error') || 'Error: {{msg}}').replace('{{msg}}', e.message), 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = t('skills.knowledge.add_url_btn') || 'Añadir URL';
        }
    }


    async function _deleteItem(id) {
        if (!confirm(t('skills.knowledge.confirm_delete') || '¿Eliminar?')) return;
        try {
            await api.del('/api/knowledge/' + encodeURIComponent(id));
            _items = _items.filter(function (i) { return i.id !== id; });
            _page = 1; _render();
            toast(t('skills.knowledge.deleted') || 'Eliminado', 'info');
        } catch (e) { toast(e.message, 'error'); }
    }

    function _fmtChars(n) {
        if (!n) return '0 chars';
        var label = t('skills.knowledge.char_count') || '{{n}} caracteres';
        if (n >= 1000) return label.replace('{{n}}', (n / 1000).toFixed(1) + 'k');
        return label.replace('{{n}}', String(n));
    }

    function getItems() { return _items; }

    return {
        init: init, load: load, getItems: getItems,
        setQuery: function (q) { _query = q || ''; _page = 1; _render(); },
    };
})();
