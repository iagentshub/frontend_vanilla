(function () {
    'use strict';

    var _ITEMS = {
        agents:      { icon: '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="11" r="1.2" fill="currentColor"/></svg>', label: 'Agentes',     href: '/agents' },
        connections: { icon: '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="4" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="4" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="13" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M4 6v2a4 4 0 0 0 4 4m0 0V6m0 6a4 4 0 0 0 4-4V6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>', label: 'Conexiones', href: '/connections' },
        skills:      { icon: '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l1.5 3 3.3.5-2.4 2.3.6 3.3L8 9l-3 1.6.6-3.3L3.2 5l3.3-.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>', label: 'Skills',      href: '/knowledge' },
        memory:      { icon: '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 2v3h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 8h5M5.5 10.5h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>', label: 'Memorias',    href: '/memory' },
        knowledge:   { icon: '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 13V3.5A1.5 1.5 0 0 1 3.5 2H13v11H3.5A1.5 1.5 0 0 1 2 11.5v0A1.5 1.5 0 0 1 3.5 10H13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 5.5h4M5.5 7.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>', label: 'Conocimiento', href: '/knowledge' },
    };

    var _DATA_FN = {
        agents:      function (d) { return d.agents.length; },
        connections: function (d) { return d.connections.length; },
        skills:      function (d) { return d.skills.length; },
        memory:      function (d) { return d.memories.length; },
        knowledge:   function (d) { return d.knowledge.length; },
    };

    var _PREVIEW = (function () {
        var c = '';
        [0, 33, 66, 99, 132].forEach(function (x) {
            c += '<rect x="'+x+'" y="0" width="26" height="46" rx="4" fill="var(--surface-2)" stroke="var(--line)" stroke-width="1"/>'+
                 '<circle cx="'+(x+13)+'" cy="13" r="7" fill="var(--accent-dim)"/>'+
                 '<rect x="'+(x+3)+'" y="26" width="20" height="6" rx="2" fill="var(--ink)" opacity="0.55"/>'+
                 '<rect x="'+(x+4)+'" y="36" width="14" height="3" rx="1.5" fill="var(--ink-3)" opacity="0.38"/>';
        });
        return '<svg viewBox="0 0 158 46" fill="none">'+c+'</svg>';
    }());

    function _render(data, cfg, el) {
        var keys = (cfg.items && cfg.items.length) ? cfg.items : Object.keys(_ITEMS);
        var size = cfg.size || 'large';

        if (size === 'small') {
            // Compact vertical list: big number + label, no icons
            el.innerHTML = '<div class="w-summary-list">' +
                keys.map(function (key) {
                    var meta = _ITEMS[key];
                    var val  = _DATA_FN[key] ? _DATA_FN[key](data) : 0;
                    return '<a class="w-summary-row" href="' + (meta ? meta.href : '#') + '">' +
                        '<span class="w-summary-row-val">' + val + '</span>' +
                        '<span class="w-summary-row-lbl">' + esc(meta ? meta.label : key) + '</span>' +
                        '</a>';
                }).join('') + '</div>';
            return;
        }

        if (size === 'medium') {
            // Cards without icons, compact padding
            el.innerHTML = '<div class="dash-stats">' +
                keys.map(function (key) {
                    var meta = _ITEMS[key];
                    var val  = _DATA_FN[key] ? _DATA_FN[key](data) : 0;
                    return '<a class="dash-stat-card dash-stat-card--compact" href="' + (meta ? meta.href : '#') + '">' +
                        '<div class="dash-stat-value">' + val + '</div>' +
                        '<div class="dash-stat-label">' + esc(meta ? meta.label : key) + '</div>' +
                        '</a>';
                }).join('') + '</div>';
            return;
        }

        // large: full cards with icon
        el.innerHTML = '<div class="dash-stats">' +
            keys.map(function (key) {
                var meta = _ITEMS[key];
                var val  = _DATA_FN[key] ? _DATA_FN[key](data) : 0;
                return '<a class="dash-stat-card" href="' + (meta ? meta.href : '#') + '">' +
                    '<div class="dash-stat-icon">' + (meta ? meta.icon : '') + '</div>' +
                    '<div class="dash-stat-body">' +
                    '<div class="dash-stat-value">' + val + '</div>' +
                    '<div class="dash-stat-label">' + esc(meta ? meta.label : key) + '</div>' +
                    '</div></a>';
            }).join('') + '</div>';
    }

    window._WIDGET_REGISTRY = window._WIDGET_REGISTRY || {};
    window._WIDGET_REGISTRY['summary'] = {
        title: 'Resumen',
        cols: 4,
        preview: _PREVIEW,
        defaultConfig: { size: 'large', items: ['agents', 'connections', 'skills', 'memory', 'knowledge'] },
        render: _render,
    };
}());
