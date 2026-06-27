(function () {
    'use strict';

    var _AVATAR_COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#db2777','#0f766e'];
    var _TYPE_LABELS   = { agent: 'Agente', skill: 'Skill', knowledge: 'Knowledge' };

    var _offset    = 0;
    var _limit     = 40;
    var _hasMore   = false;
    var _loading   = false;
    var _searchTimer = null;
    var _starred   = {};   // resource_type+resource_id → true

    function _avatarColor(name) {
        var code = 0;
        for (var i = 0; i < (name || '').length; i++) code += name.charCodeAt(i);
        return _AVATAR_COLORS[code % _AVATAR_COLORS.length];
    }

    function _getFilters() {
        return {
            type:     (document.querySelector('.explore-type-tab.active') || {}).dataset.type || 'all',
            category: (document.getElementById('explore-category') || {}).value || '',
            q:        (document.getElementById('explore-search') || {}).value || '',
        };
    }

    function _buildUrl(filters, offset) {
        var params = [];
        if (filters.type && filters.type !== 'all') params.push('type=' + encodeURIComponent(filters.type));
        if (filters.category) params.push('category=' + encodeURIComponent(filters.category));
        if (filters.q)        params.push('q=' + encodeURIComponent(filters.q));
        params.push('limit=' + (_limit + 1));  // fetch one extra to detect more
        params.push('offset=' + offset);
        return '/api/explore' + (params.length ? '?' + params.join('&') : '');
    }

    function _renderCard(r) {
        var key     = r.resource_type + ':' + r.resource_id;
        var color   = _avatarColor(r.name);
        var initial = (r.name || '?').charAt(0).toUpperCase();
        var starred = !!_starred[key];
        var forkBadge = r.fork_of_id
            ? '<span class="explore-card-fork-badge">fork</span>'
            : (r.linked_to_id ? '<span class="explore-card-fork-badge">linked</span>' : '');
        return '<div class="explore-card" data-id="' + esc(r.resource_id) + '" data-type="' + esc(r.resource_type) + '" data-owner="' + esc(r.owner) + '">' +
            '<div class="explore-card-top">' +
            '<div class="explore-card-avatar" style="background:' + color + '">' + initial + '</div>' +
            '<div class="explore-card-info">' +
            '<div class="explore-card-name" title="' + esc(r.name) + '">' + esc(r.name) + '</div>' +
            '<div class="explore-card-meta">' +
            '<span class="explore-card-type-badge">' + esc(_TYPE_LABELS[r.resource_type] || r.resource_type) + '</span>' +
            esc(r.category || '') +
            forkBadge +
            '</div>' +
            '</div>' +
            '</div>' +
            '<p class="explore-card-desc">' + esc(r.description || '') + '</p>' +
            '<div class="explore-card-footer">' +
            '<a href="/u/' + encodeURIComponent(r.owner) + '" class="explore-card-author">@' + esc(r.owner) + '</a>' +
            '<button class="explore-card-star-btn' + (starred ? ' starred' : '') + '" data-action="star" data-key="' + esc(key) + '" data-type="' + esc(r.resource_type) + '" data-id="' + esc(r.resource_id) + '">' +
            '★ <span class="star-count">' + (r.stars_count || 0) + '</span>' +
            '</button>' +
            '</div>' +
            '</div>';
    }

    function _setLoading(on) {
        _loading = on;
        var el = document.getElementById('explore-loading');
        if (el) el.hidden = !on;
    }

    async function _load(reset) {
        if (_loading) return;
        if (reset) _offset = 0;
        _setLoading(true);
        var filters = _getFilters();
        try {
            var items = await fetch(_buildUrl(filters, _offset), { credentials: 'include' })
                .then(function (r) { if (!r.ok) throw new Error(); return r.json(); });

            _hasMore = items.length > _limit;
            if (_hasMore) items = items.slice(0, _limit);

            var grid = document.getElementById('explore-grid');
            var empty = document.getElementById('explore-empty');
            var moreWrap = document.getElementById('explore-load-more');

            if (reset) grid.innerHTML = '';

            if (!items.length && _offset === 0) {
                empty.hidden = false;
                if (moreWrap) moreWrap.hidden = true;
            } else {
                empty.hidden = true;
                grid.innerHTML += items.map(_renderCard).join('');
                _offset += items.length;
                if (moreWrap) moreWrap.hidden = !_hasMore;
            }
        } catch (_) {}
        _setLoading(false);
    }

    async function _toggleStar(btn) {
        var key  = btn.dataset.key;
        var type = btn.dataset.type;
        var id   = btn.dataset.id;
        var isStarred = !!_starred[key];
        try {
            var r;
            if (isStarred) {
                r = await fetch('/api/' + encodeURIComponent(type) + '/' + encodeURIComponent(id) + '/star', { method: 'DELETE', credentials: 'include' });
            } else {
                r = await fetch('/api/' + encodeURIComponent(type) + '/' + encodeURIComponent(id) + '/star', { method: 'POST', credentials: 'include' });
            }
            if (!r.ok) return;
            var data = await r.json();
            _starred[key] = !isStarred;
            btn.classList.toggle('starred', !isStarred);
            var countEl = btn.querySelector('.star-count');
            if (countEl) countEl.textContent = data.stars || 0;
        } catch (_) {}
    }

    function _bindFilters() {
        document.getElementById('explore-type-tabs').addEventListener('click', function (e) {
            var tab = e.target.closest('.explore-type-tab');
            if (!tab) return;
            document.querySelectorAll('.explore-type-tab').forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            _load(true);
        });

        document.getElementById('explore-category').addEventListener('change', function () {
            _load(true);
        });

        document.getElementById('explore-search').addEventListener('input', function () {
            clearTimeout(_searchTimer);
            _searchTimer = setTimeout(function () { _load(true); }, 300);
        });

        document.getElementById('explore-grid').addEventListener('click', function (e) {
            var btn = e.target.closest('[data-action="star"]');
            if (btn) { e.stopPropagation(); _toggleStar(btn); }
        });

        var moreBtn = document.getElementById('explore-load-more-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', function () { _load(false); });
        }
    }

    async function init() {
        await window.requireAuth();
        renderNav('nav-root', 'explore');
        _bindFilters();
        _load(true);
    }

    init();

}());
