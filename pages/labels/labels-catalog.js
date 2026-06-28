(function () {
    'use strict';

    var _BLOCKED_KEYS = ['quarantine', 'archived', 'delete'];
    var _DEFAULT_KEY  = 'private';

    var _SVG_LOCK = '<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    var _SVG_STAR = '<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3.5 3.8.5-2.7 2.6.6 3.8L8 10.5 4.8 12.4l.6-3.8L2.7 6l3.8-.5L8 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

    function _render() {
        var root = document.getElementById('labels-catalog-root');
        if (!root || !window.LABELS) return;

        var html = '';
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
                var isBlocked  = _BLOCKED_KEYS.indexOf(lbl.key) !== -1;
                var isDefault  = lbl.key === _DEFAULT_KEY;
                html += '<div class="lcat-label-card">';
                html += '<div class="lcat-label-dot" style="background:' + lbl.color + '"></div>';
                html += '<div class="lcat-label-info">';
                html += '<div class="lcat-label-name">' + name + '</div>';
                html += '<div class="lcat-label-key">' + lbl.key + '</div>';
                if (desc) html += '<div class="lcat-label-desc">' + desc + '</div>';
                if (isBlocked) {
                    html += '<span class="lcat-label-behavior">' + _SVG_LOCK + ' ' +
                        (window.t ? t('labels.catalog.blocks') : 'Blocks') + '</span>';
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
