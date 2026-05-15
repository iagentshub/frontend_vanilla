// main_nav.js — Barra de navegación lateral
'use strict';

var _navUserRole = 'standard';

var NAV_ICONS = {
    dashboard: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="9" width="5.5" height="5.5" rx="1.2" stroke="currentColor" stroke-width="1.4"/></svg>',
    agents: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="11" r="1.2" fill="currentColor"/></svg>',
    skills: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l1.5 3 3.3.5-2.4 2.3.6 3.3L8 9l-3 1.6.6-3.3L3.2 5l3.3-.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    knowledge: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 2v3h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 8h5M5.5 10.5h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    connections: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="4" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="4" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="13" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M4 6v2a4 4 0 0 0 4 4m0 0V6m0 6a4 4 0 0 0 4-4V6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    memory: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 2v3h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 8h5M5.5 10.5h5M5.5 13h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    profile: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 14v-.5A5.5 5.5 0 0 1 8 8a5.5 5.5 0 0 1 5.5 5.5V14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    admin: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 13v-.5A4.5 4.5 0 0 1 6 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="11.5" cy="10.5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M11.5 9.2v1.3l.8.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    lang: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M8 2c-1.5 2-2.5 3.8-2.5 6s1 4 2.5 6M8 2c1.5 2 2.5 3.8 2.5 6S9.5 14 8 14M2 8h12" stroke="currentColor" stroke-width="1.2"/></svg>',
};

function _renderLangSwitcher() {
    var lang = window.i18n ? window.i18n.getLang() : 'es';
    var other = lang === 'es' ? 'en' : 'es';
    return '<button class="nav-lang-btn" id="nav-lang-btn" title="Switch language" aria-label="Switch language">' +
        NAV_ICONS.lang +
        '<span class="nav-lang-label">' + lang.toUpperCase() + '</span>' +
        '</button>';
}

function renderNav(mountId, activePage) {
    var mount = document.getElementById(mountId);
    if (!mount) return;

    function _build() {
        var links = [
            { href: '/dashboard', label: t('nav.dashboard'), page: 'dashboard' },
            { href: '/agents', label: t('nav.agents'), page: 'agents' },
            { href: '/knowledge', label: t('nav.knowledge'), page: 'knowledge' },
            { href: '/connections', label: t('nav.connections'), page: 'connections' },
            { href: '/memory', label: t('nav.memory'), page: 'memory' },
            { href: '/profile', label: t('nav.profile'), page: 'profile' },
        ];

        mount.innerHTML =
            '<nav class="main-nav">' +
            '<a class="nav-brand" href="/dashboard">' +
            '<div class="nav-logo-mark">' +
            '<span class="nav-logo-iagents">iAgents</span><span class="nav-logo-hub">Hub</span>' +
            '</div>' +
            '</a>' +
            '<div class="nav-section">' +
            links.map(function (l) {
                var active = activePage === l.page ? ' active' : '';
                return '<a href="' + l.href + '" class="nav-link' + active + '">' +
                    '<span class="nav-link-icon">' + NAV_ICONS[l.page] + '</span>' +
                    l.label +
                    '</a>';
            }).join('') +
            '</div>' +
            '<div class="nav-spacer"></div>' +
            '<div class="nav-footer">' +
            _renderLangSwitcher() +
            '<button class="nav-user" id="nav-logout-btn" title="' + t('nav.logout') + '">' +
            '<div class="nav-user-avatar" id="nav-avatar">?</div>' +
            '<span id="nav-username">…</span>' +
            '<svg class="nav-logout-icon" width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '</div>' +
            '</nav>';

        fetch('/api/auth/me').then(function (r) { return r.json(); }).then(function (d) {
            var u = d.username || '';
            _navUserRole = d.role || 'standard';
            var el = document.getElementById('nav-username');
            var av = document.getElementById('nav-avatar');
            if (el) el.textContent = u;
            if (av) av.textContent = u.charAt(0).toUpperCase();

            if (d.role === 'admin') {
                var adminSection = document.createElement('div');
                adminSection.className = 'nav-section nav-admin-section';
                adminSection.innerHTML =
                    '<div class="nav-section-label">' + t('nav.admin') + '</div>' +
                    '<a href="/admin/" class="nav-link' + (activePage === 'admin-users' ? ' active' : '') + '">' +
                    '<span class="nav-link-icon">' + NAV_ICONS.admin + '</span>' +
                    t('nav.admin_users') +
                    '</a>';
                var spacer = mount.querySelector('.nav-spacer');
                if (spacer) spacer.before(adminSection);
            }
        }).catch(function () { });

        document.getElementById('nav-logout-btn').addEventListener('click', async function () {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.replace('/login');
        });

        var langBtn = document.getElementById('nav-lang-btn');
        if (langBtn) {
            langBtn.addEventListener('click', function () {
                var curr = window.i18n ? window.i18n.getLang() : 'es';
                var next = curr === 'es' ? 'en' : 'es';
                if (window.i18n) window.i18n.setLang(next);
                if (_navUserRole !== 'guest') {
                    fetch('/api/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ language: next }),
                    }).catch(function () {});
                }
            });
        }
    }

    if (window.i18n) {
        window.i18n.ready(_build);
        window.i18n.onLangChange(function () { _build(); });
    } else {
        _build();
    }
}

window.renderNav = renderNav;
