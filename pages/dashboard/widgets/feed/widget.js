(function () {
    'use strict';

    var _PREVIEW =
        '<div class="wfeed-preview">' +
        ['Mi agente de análisis', 'Skill de redacción', 'Base de conocimiento'].map(function (s) {
            return '<div class="wfeed-preview-row"><span class="wfeed-preview-dot"></span>' + s + '</div>';
        }).join('') +
        '</div>';

    var _COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#db2777','#0f766e'];
    var _LABELS = { agent: 'Agente', skill: 'Skill', knowledge: 'Knowledge' };
    var _starred = {};

    function _color(s) {
        var c = 0;
        for (var i = 0; i < (s || '').length; i++) c += s.charCodeAt(i);
        return _COLORS[c % _COLORS.length];
    }

    function _relDate(iso) {
        try {
            var diff = Date.now() - new Date(iso).getTime();
            var min  = Math.floor(diff / 60000);
            if (min < 60)   return 'hace ' + min + 'min';
            var h = Math.floor(min / 60);
            if (h < 24)     return 'hace ' + h + 'h';
            return 'hace ' + Math.floor(h / 24) + 'd';
        } catch (_) { return ''; }
    }

    function _esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function _card(r, density) {
        var key     = r.resource_type + ':' + r.resource_id;
        var starred = !!_starred[key];
        var initial = (r.name || '?').charAt(0).toUpperCase();
        var desc    = (density !== 'compact' && r.description)
            ? '<div class="wfeed-card-desc">' + _esc(r.description) + '</div>'
            : '';

        return '<div class="wfeed-card wfeed-card--' + (density || 'normal') + '">' +
            '<div class="wfeed-card-icon" style="background:' + _color(r.name) + '">' + initial + '</div>' +
            '<div class="wfeed-card-body">' +
            '<div class="wfeed-card-name">' + _esc(r.name) + '</div>' +
            desc +
            '<div class="wfeed-card-meta">' +
            '<span class="wfeed-badge">' + _esc(_LABELS[r.resource_type] || r.resource_type) + '</span>' +
            '<a href="/u/' + encodeURIComponent(r.owner) + '" class="wfeed-author" onclick="event.stopPropagation()">@' + _esc(r.owner) + '</a>' +
            '<span class="wfeed-date">' + _relDate(r.updated_at) + '</span>' +
            '</div>' +
            '</div>' +
            '<button class="wfeed-star' + (starred ? ' starred' : '') + '" data-action="wfeed-star"' +
            ' data-key="' + _esc(key) + '" data-type="' + _esc(r.resource_type) + '" data-id="' + _esc(r.resource_id) + '"' +
            ' title="Star" onclick="event.stopPropagation()">★<span>' + (r.stars_count || 0) + '</span></button>' +
            '</div>';
    }

    async function _toggleStar(btn) {
        var key  = btn.dataset.key;
        var type = btn.dataset.type;
        var id   = btn.dataset.id;
        var was  = !!_starred[key];
        try {
            var res = await fetch('/api/' + encodeURIComponent(type) + '/' + encodeURIComponent(id) + '/star', {
                method: was ? 'DELETE' : 'POST', credentials: 'include',
            });
            if (!res.ok) return;
            var d = await res.json();
            _starred[key] = !was;
            btn.classList.toggle('starred', !was);
            var span = btn.querySelector('span');
            if (span) span.textContent = d.stars || 0;
        } catch (_) {}
    }

    function _render(data, cfg, el) {
        var limit   = parseInt(cfg.limit, 10) || 8;
        var types   = Array.isArray(cfg.types) ? cfg.types : [];
        var density = cfg.density || 'normal';

        // Si hay exactamente un tipo, filtramos en el servidor; si hay varios (o ninguno = todos),
        // pedimos sin filtro y filtramos en cliente si es necesario.
        var singleType = types.length === 1 ? types[0] : null;
        var fetchLimit = singleType ? limit : limit * Math.max(1, types.length || 1);
        fetchLimit = Math.min(fetchLimit, 100);

        var url = '/api/feed?limit=' + fetchLimit;
        if (singleType) url += '&type=' + encodeURIComponent(singleType);

        el.innerHTML = '<div class="wfeed-loading"><div class="spinner spinner--sm"></div></div>';

        fetch(url, { credentials: 'include' })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (items) {
                // Filtrado en cliente cuando hay selección múltiple
                if (types.length > 1) {
                    items = items.filter(function (r) { return types.indexOf(r.resource_type) !== -1; });
                }
                items = items.slice(0, limit);

                if (!items.length) {
                    el.innerHTML =
                        '<div class="wfeed-empty">' +
                        '<p>No hay publicaciones. Sigue usuarios en <a href="/explore">Explorar</a>.</p>' +
                        '</div>';
                    return;
                }

                el.innerHTML = '<div class="wfeed-list wfeed-list--' + density + '">' +
                    items.map(function (r) { return _card(r, density); }).join('') +
                    '</div>';

                el.addEventListener('click', function (e) {
                    var btn = e.target.closest('[data-action="wfeed-star"]');
                    if (btn) { e.preventDefault(); _toggleStar(btn); }
                });
            })
            .catch(function () {
                el.innerHTML = '<div class="wfeed-empty"><p>Error al cargar el feed.</p></div>';
            });
    }

    window._WIDGET_REGISTRY = window._WIDGET_REGISTRY || {};
    window._WIDGET_REGISTRY['feed'] = {
        title:         'Feed',
        cols:          2,
        preview:       _PREVIEW,
        defaultConfig: { size: 'medium', types: ['agent', 'skill', 'knowledge'], limit: 8, density: 'normal' },
        render:        _render,
    };
}());
