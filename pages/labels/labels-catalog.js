(function () {
    'use strict';

    var _BLOCKED_KEYS = ['draft', 'quarantine', 'archived', 'delete'];
    var _WARN_KEYS    = ['deprecated'];
    var _DEFAULT_KEY  = 'private';

    // Tipos de origen: se calculan automáticamente, no son etiquetas manuales.
    var _ORIGIN_TYPES = [
        { key: 'owner',  color: '#16a34a', cssClass: 'origin-badge--owner',  i18nName: 'agents.origin.owner',  i18nDesc: 'labels.desc.origin_owner' },
        { key: 'fork',   color: '#e65100', cssClass: 'origin-badge--fork',   i18nName: 'agents.origin.fork',   i18nDesc: 'labels.desc.origin_fork'  },
        { key: 'linked', color: '#0ea5e9', cssClass: 'origin-badge--linked', i18nName: 'agents.origin.linked', i18nDesc: 'labels.desc.origin_linked' },
    ];

    var _SVG_LOCK = '<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    var _SVG_STAR = '<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3.5 3.8.5-2.7 2.6.6 3.8L8 10.5 4.8 12.4l.6-3.8L2.7 6l3.8-.5L8 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    var _SVG_AUTO = '<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M13 8A5 5 0 1 1 8 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 1l3 2-3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    function _render() {
        var root = document.getElementById('labels-catalog-root');
        if (!root || !window.LABELS) return;

        var html = '';

        // ── Etiquetas manuales (desde LABELS.GROUPS) ──────────────────────────
        LABELS.GROUPS.forEach(function (group) {
            var groupName = window.t ? t('labels.group.' + group.id) : group.id;
            var hint = group.exclusive
                ? (window.t ? t('labels.group.exclusive_hint') : 'Exclusive')
                : (window.t ? t('labels.group.multi_hint') : 'Multi');
            html += '<section class="lcat-group">';
            html += '<div class="lcat-group-header">';
            html += '<span class="lcat-group-title">' + groupName + '</span>';
            html += '<span class="lcat-group-meta">' + hint + '</span>';
            html += '</div>';
            html += '<div class="lcat-labels-grid">';
            group.labels.forEach(function (lbl) {
                var name = LABELS.getLabel(lbl.key);
                var desc = window.t ? t('labels.desc.' + lbl.key) : '';
                var isBlocked = _BLOCKED_KEYS.indexOf(lbl.key) !== -1;
                var isWarn    = _WARN_KEYS.indexOf(lbl.key) !== -1;
                var isDefault = lbl.key === _DEFAULT_KEY;
                html += '<div class="lcat-label-card">';
                html += '<div class="lcat-label-dot" style="background:' + lbl.color + '"></div>';
                html += '<div class="lcat-label-info">';
                html += '<div class="lcat-label-name">' + name + '</div>';
                html += '<div class="lcat-label-key">' + lbl.key + '</div>';
                if (desc) html += '<div class="lcat-label-desc">' + desc + '</div>';
                if (isBlocked) {
                    html += '<span class="lcat-label-behavior">' + _SVG_LOCK + ' ' +
                        (window.t ? t('labels.catalog.blocks') : 'Blocks') + '</span>';
                } else if (isWarn) {
                    html += '<span class="lcat-label-behavior" style="color:var(--warning,#ca8a04);background:color-mix(in srgb,#ca8a04 10%,transparent)">' + _SVG_STAR + ' ' +
                        (window.t ? t('labels.catalog.warns') : 'Warning') + '</span>';
                }
                if (isDefault) {
                    html += '<span class="lcat-label-default">' + _SVG_STAR + ' ' +
                        (window.t ? t('labels.catalog.default') : 'Default') + '</span>';
                }
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
            html += '</section>';
        });

        // ── Tipos de origen (calculados automáticamente, no editables) ─────────
        var originTitle  = window.t ? t('agents.origin.label')           : 'Origen';
        var originHint   = window.t ? t('labels.catalog.origin_computed') : 'Calculado automáticamente';
        html += '<section class="lcat-group">';
        html += '<div class="lcat-group-header">';
        html += '<span class="lcat-group-title">' + originTitle + '</span>';
        html += '<span class="lcat-group-meta">' + originHint + '</span>';
        html += '</div>';
        html += '<div class="lcat-labels-grid">';
        _ORIGIN_TYPES.forEach(function (ot) {
            var name = window.t ? t(ot.i18nName) : ot.key;
            var desc = window.t ? t(ot.i18nDesc) : '';
            html += '<div class="lcat-label-card">';
            html += '<div class="lcat-label-dot" style="background:' + ot.color + '"></div>';
            html += '<div class="lcat-label-info">';
            html += '<span class="origin-badge ' + ot.cssClass + '" style="margin-bottom:4px;display:inline-block">' + name + '</span>';
            html += '<div class="lcat-label-key">' + ot.key + '</div>';
            if (desc) html += '<div class="lcat-label-desc">' + desc + '</div>';
            html += '<span class="lcat-label-behavior" style="color:var(--accent,#6366f1);background:color-mix(in srgb,#6366f1 10%,transparent)">' +
                _SVG_AUTO + ' ' + originHint + '</span>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
        html += '</section>';

        root.innerHTML = html;
    }

    async function init() {
        await window.requireAuth();
        renderNav('nav-root', 'labels');
        if (window.i18n) {
            window.i18n.ready(function () { _render(); });
            window.i18n.onLangChange(function () { _render(); });
        } else {
            _render();
        }
    }

    init();
}());
