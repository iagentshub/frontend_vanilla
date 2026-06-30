(function () {
    'use strict';

    var _TYPE_LABELS = { agent: 'Agente', skill: 'Skill', knowledge: 'Knowledge' };
    var _COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#db2777','#0f766e'];

    var _drawer   = null;
    var _backdrop = null;
    var _body     = null;
    var _loaded   = false;
    var _starred  = {};

    function _color(name) {
        var c = 0;
        for (var i = 0; i < (name || '').length; i++) c += name.charCodeAt(i);
        return _COLORS[c % _COLORS.length];
    }

    function _relDate(iso) {
        if (!iso) return '';
        try {
            var diff = Date.now() - new Date(iso).getTime();
            var min  = Math.floor(diff / 60000);
            if (min < 60)   return 'hace ' + min + 'min';
            var h = Math.floor(min / 60);
            if (h < 24)     return 'hace ' + h + 'h';
            var d = Math.floor(h / 24);
            if (d < 30)     return 'hace ' + d + 'd';
            return new Date(iso).toLocaleDateString();
        } catch (_) { return ''; }
    }

    function _esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function _renderCard(r) {
        var key     = r.resource_type + ':' + r.resource_id;
        var color   = _color(r.name);
        var initial = (r.name || '?').charAt(0).toUpperCase();
        var label   = _TYPE_LABELS[r.resource_type] || r.resource_type;
        var starred = !!_starred[key];

        return '<div class="feed-mini-card" data-type="' + _esc(r.resource_type) + '" data-id="' + _esc(r.resource_id) + '">' +
            '<div class="feed-mini-top">' +
            '<div class="feed-mini-avatar" style="background:' + color + '">' + initial + '</div>' +
            '<div class="feed-mini-info">' +
            '<div class="feed-mini-name">' + _esc(r.name) + '</div>' +
            '<div class="feed-mini-meta">' +
            '<span class="feed-mini-type-badge">' + _esc(label) + '</span>' +
            _esc(r.category || '') +
            '</div>' +
            '</div>' +
            '</div>' +
            (r.description ? '<p class="feed-mini-desc">' + _esc(r.description) + '</p>' : '') +
            '<div class="feed-mini-footer">' +
            '<a href="/u/' + encodeURIComponent(r.owner) + '" class="feed-mini-author" onclick="event.stopPropagation()">@' + _esc(r.owner) + '</a>' +
            '<span class="feed-mini-date">' + _relDate(r.updated_at) + '</span>' +
            '<button class="feed-mini-star' + (starred ? ' starred' : '') + '" data-action="star" data-key="' + _esc(key) + '" data-type="' + _esc(r.resource_type) + '" data-id="' + _esc(r.resource_id) + '" onclick="event.stopPropagation()">' +
            '★ ' + (r.stars_count || 0) +
            '</button>' +
            '</div>' +
            '</div>';
    }

    async function _toggleStar(btn) {
        var key     = btn.dataset.key;
        var type    = btn.dataset.type;
        var id      = btn.dataset.id;
        var starred = !!_starred[key];
        try {
            var url = '/api/' + encodeURIComponent(type) + '/' + encodeURIComponent(id) + '/star';
            var data = await (starred ? api.del(url) : api.post(url, {}));
            _starred[key] = !starred;
            btn.classList.toggle('starred', !starred);
            btn.textContent = '★ ' + (data.stars || 0);
        } catch (err) { console.error('[feed_widget] Error al actualizar estrella:', err); }
    }

    async function _load() {
        if (_loaded) return;
        _loaded = true;

        _body.innerHTML = '<div class="feed-drawer-spinner"><div class="spinner"></div></div>';

        try {
            var items = await api.get('/api/feed?limit=30');

            if (!items.length) {
                _body.innerHTML =
                    '<div class="feed-drawer-empty">' +
                    '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h4"/><line x1="16" y1="11" x2="16" y2="17"/><line x1="13" y1="14" x2="19" y2="14"/></svg>' +
                    '<p>Sigue usuarios desde <a href="/explore" onclick="window.FeedWidget.close()">Explorar</a> para ver su actividad aquí.</p>' +
                    '</div>';
                return;
            }

            _body.innerHTML = items.map(_renderCard).join('');

            _body.addEventListener('click', function (e) {
                var starBtn = e.target.closest('[data-action="star"]');
                if (starBtn) { e.preventDefault(); _toggleStar(starBtn); return; }
            });
        } catch (_) {
            _body.innerHTML = '<div class="feed-drawer-empty"><p>Error al cargar el feed.</p></div>';
        }
    }

    function _mount() {
        if (_drawer) return;

        var bd = document.createElement('div');
        bd.className = 'feed-drawer-backdrop';
        bd.addEventListener('click', close);
        document.body.appendChild(bd);
        _backdrop = bd;

        var panel = document.createElement('div');
        panel.className = 'feed-drawer';
        panel.innerHTML =
            '<div class="feed-drawer-header">' +
            '<span class="feed-drawer-title">Feed</span>' +
            '<button class="feed-drawer-close" id="feed-drawer-close-btn" aria-label="Cerrar">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
            '</button>' +
            '</div>' +
            '<div class="feed-drawer-body" id="feed-drawer-body"></div>';
        document.body.appendChild(panel);
        _drawer = panel;
        _body   = panel.querySelector('#feed-drawer-body');

        panel.querySelector('#feed-drawer-close-btn').addEventListener('click', close);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }

    function open() {
        _mount();
        _backdrop.classList.add('visible');
        _drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
        _load();
    }

    function close() {
        if (!_drawer) return;
        _backdrop.classList.remove('visible');
        _drawer.classList.remove('open');
        document.body.style.overflow = '';
    }

    function toggle() {
        if (_drawer && _drawer.classList.contains('open')) close(); else open();
    }

    window.FeedWidget = { open: open, close: close, toggle: toggle };
}());
