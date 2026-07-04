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
    docs: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 2v3h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="9.5" r="1" fill="currentColor"/><path d="M8 7v1.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    about: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="5.5" r="0.9" fill="currentColor"/><path d="M8 7.5v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    logs: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 5.5h7M4.5 8h5M4.5 10.5h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    mail: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M1 7l7 4.5L15 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    team: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="5" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="11" cy="5" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 13v-.5A3.5 3.5 0 0 1 5 9a3.5 3.5 0 0 1 3.5 3.5V13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9 9.2A3.5 3.5 0 0 1 14.5 12.5V13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    explore: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 5.5l-2 4.5-4.5 2 2-4.5 4.5-2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/></svg>',
    feed: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    labels: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 5a1 1 0 0 1 1-1h6.5l4 4-4 4H3a1 1 0 0 1-1-1V5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="5.5" cy="8" r="1" fill="currentColor"/></svg>',
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
    var _buildGen = 0;

    function _build() {
        var gen = ++_buildGen;
        var links = [
            { href: '/dashboard', label: t('nav.dashboard'), page: 'dashboard' },
            { href: '/agents', label: t('nav.agents'), page: 'agents' },
            { href: '/knowledge', label: t('nav.knowledge'), page: 'knowledge' },
            { href: '/explore', label: t('nav.explore'), page: 'explore' },
            { href: '/connections', label: t('nav.connections'), page: 'connections' },
        ];

        mount.innerHTML =
            '<nav class="main-nav">' +
            '<div class="nav-brand-row">' +
            '<a class="nav-brand" href="/dashboard">' +
            '<div class="nav-logo-mark">' +
            '<span class="nav-logo-iagents">iAgents</span><span class="nav-logo-hub">Hub</span>' +
            '</div>' +
            '</a>' +
            '<button class="nav-close-btn" id="nav-close-btn" aria-label="Cerrar menú">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
            '</button>' +
            '</div>' +
            '<div class="nav-workspace-bar">' +
            '<button class="nav-ws-btn" id="nav-ws-btn" aria-label="Cambiar workspace">' +
            '<svg class="nav-ws-icon" width="11" height="11" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="2" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="9" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="9" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.5"/></svg>' +
            '<span class="nav-ws-name" id="nav-ws-name">Personal</span>' +
            '<svg class="nav-ws-chevron" width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<div class="nav-ws-dropdown" id="nav-ws-dropdown" hidden>' +
            '<div class="nav-ws-list" id="nav-ws-list"></div>' +
            '<div class="nav-ws-footer">' +
            '<button class="nav-ws-create-btn" id="nav-ws-create-btn">+ Nuevo workspace</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
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
            '<div class="nav-footer-actions">' +
            _renderLangSwitcher() +
            '<button class="nav-icon-btn" id="nav-feed-btn" title="Feed" aria-label="Feed">' +
            NAV_ICONS.feed +
            '</button>' +
            '<a href="/labels" class="nav-icon-btn' + (activePage === 'labels' ? ' active' : '') + '" title="' + t('labels.catalog.nav_title') + '" aria-label="' + t('labels.catalog.nav_title') + '">' +
            NAV_ICONS.labels +
            '</a>' +
            '<a href="/docs" class="nav-icon-btn' + (activePage === 'docs' ? ' active' : '') + '" title="' + t('nav.docs') + '" aria-label="' + t('nav.docs') + '">' +
            NAV_ICONS.docs +
            '</a>' +
            '<a href="/about" class="nav-icon-btn' + (activePage === 'about' ? ' active' : '') + '" title="' + t('nav.about') + '" aria-label="' + t('nav.about') + '">' +
            NAV_ICONS.about +
            '</a>' +
            '</div>' +
            '<div class="nav-user-row">' +
            '<button class="nav-user" id="nav-profile-btn" title="' + t('nav.profile') + '">' +
            '<div class="nav-user-avatar" id="nav-avatar">?</div>' +
            '<span id="nav-username">…</span>' +
            '</button>' +
            '<button class="nav-logout-btn" id="nav-logout-btn" title="' + t('nav.logout') + '" aria-label="' + t('nav.logout') + '">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '</div>' +
            '</div>' +
            '</nav>';

        fetch('/api/auth/me').then(function (r) { return r.json(); }).then(function (d) {
            if (gen !== _buildGen) return;
            var u = d.username || '';
            _navUserRole = d.role || 'standard';
            var el = document.getElementById('nav-username');
            var av = document.getElementById('nav-avatar');
            if (el) el.textContent = u;
            if (av) av.textContent = u.charAt(0).toUpperCase();

            // Workspace name in nav bar
            var wsNameEl = document.getElementById('nav-ws-name');
            if (wsNameEl && d.workspace_name) {
                wsNameEl.textContent = d.workspace_name;
            }

            // Load workspace list
            _loadWorkspaces(d.workspace_id || u);

            if (d.role === 'admin') {
                var adminSection = document.createElement('div');
                adminSection.className = 'nav-section nav-admin-section';
                var mailItem = d.webmail_url
                    ? '<a href="' + d.webmail_url + '" target="_blank" rel="noopener" class="nav-link">' +
                    '<span class="nav-link-icon">' + NAV_ICONS.mail + '</span>' +
                    t('nav.admin_mail') +
                    '</a>'
                    : '';
                adminSection.innerHTML =
                    '<div class="nav-section-label">' + t('nav.admin') + '</div>' +
                    '<a href="/admin/" class="nav-link' + (activePage === 'admin-users' ? ' active' : '') + '">' +
                    '<span class="nav-link-icon">' + NAV_ICONS.admin + '</span>' +
                    t('nav.admin_users') +
                    '</a>' +
                    '<a href="/admin/metadata/" class="nav-link' + (activePage === 'admin-metadata' ? ' active' : '') + '">' +
                    '<span class="nav-link-icon">' + NAV_ICONS.logs + '</span>' +
                    'Sistema' +
                    '</a>' +
                    mailItem;
                var spacer = mount.querySelector('.nav-spacer');
                if (spacer) spacer.before(adminSection);
            }
        }).catch(function () { });

        // ── Workspace switcher logic ──────────────────────────────────────
        function _loadWorkspaces(activeWsId) {
            api.get('/api/workspaces').then(function (list) {
                var listEl = document.getElementById('nav-ws-list');
                if (!listEl) return;
                listEl.innerHTML = list.map(function (ws) {
                    var isCurrent = ws.active;
                    return '<button class="nav-ws-item' + (isCurrent ? ' nav-ws-item--active' : '') + '" data-ws-id="' + esc(ws.id) + '" data-ws-name="' + esc(ws.name) + '">' +
                        '<span class="nav-ws-item-name">' + esc(ws.name) + '</span>' +
                        (ws.type === 'personal' ? '<span class="nav-ws-badge">Personal</span>' : '') +
                        (isCurrent ? '<svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') +
                        '</button>';
                }).join('');

                listEl.querySelectorAll('.nav-ws-item').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var wsId = btn.getAttribute('data-ws-id');
                        var wsName = btn.getAttribute('data-ws-name');
                        if (btn.classList.contains('nav-ws-item--active')) {
                            _closeWsDropdown();
                            return;
                        }
                        api.post('/api/workspaces/switch/' + encodeURIComponent(wsId), {})
                            .then(function () { window.location.reload(); })
                            .catch(function () { });
                    });
                });
            }).catch(function () { });
        }

        function _openWsDropdown() {
            var dd = document.getElementById('nav-ws-dropdown');
            if (dd) dd.removeAttribute('hidden');
        }
        function _closeWsDropdown() {
            var dd = document.getElementById('nav-ws-dropdown');
            if (dd) dd.setAttribute('hidden', '');
        }
        function _toggleWsDropdown() {
            var dd = document.getElementById('nav-ws-dropdown');
            if (!dd) return;
            if (dd.hasAttribute('hidden')) { _openWsDropdown(); } else { _closeWsDropdown(); }
        }

        var wsBtn = document.getElementById('nav-ws-btn');
        if (wsBtn) {
            wsBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                _toggleWsDropdown();
            });
        }

        var wsCreateBtn = document.getElementById('nav-ws-create-btn');
        if (wsCreateBtn) {
            wsCreateBtn.addEventListener('click', function () {
                _closeWsDropdown();
                var name = window.prompt('Nombre del nuevo workspace:');
                if (!name || !name.trim()) return;
                api.post('/api/workspaces', { name: name.trim() })
                    .then(function (ws) {
                        if (ws.id) {
                            return api.post('/api/workspaces/switch/' + encodeURIComponent(ws.id), {});
                        }
                    }).then(function () { window.location.reload(); })
                    .catch(function () { });
            });
        }

        document.addEventListener('click', function (e) {
            var dd = document.getElementById('nav-ws-dropdown');
            var btn = document.getElementById('nav-ws-btn');
            if (dd && !dd.hasAttribute('hidden') && btn && !btn.contains(e.target) && !dd.contains(e.target)) {
                _closeWsDropdown();
            }
        });

        document.getElementById('nav-profile-btn').addEventListener('click', function () {
            window.location.href = '/profile';
        });

        document.getElementById('nav-logout-btn').addEventListener('click', async function () {
            var msg = t('nav.logout_confirm') || '¿Cerrar sesión?';
            if (!confirm(msg)) return;
            await api.post('/api/auth/logout', {});
            window.location.replace('/login');
        });

        // ── Feed widget button ───────────────────────────────────────────────
        var feedBtn = document.getElementById('nav-feed-btn');
        if (feedBtn) {
            feedBtn.addEventListener('click', function () {
                if (window.FeedWidget) {
                    window.FeedWidget.toggle();
                    return;
                }
                // Lazy-load widget on first click
                var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/assets/components/feed_widget/feed_widget.css';
                document.head.appendChild(link);
                var s = document.createElement('script');
                s.src = '/assets/components/feed_widget/feed_widget.js';
                s.onload = function () { window.FeedWidget.open(); };
                document.head.appendChild(s);
            });
        }

        // ── Close button inside nav (móvil) ─────────────────────────────────
        var _navCloseBtn = document.getElementById('nav-close-btn');
        if (_navCloseBtn) {
            _navCloseBtn.addEventListener('click', function () {
                var nav = document.querySelector('.main-nav');
                var backdrop = document.getElementById('nav-backdrop');
                var hamburger = document.getElementById('nav-hamburger');
                if (nav) nav.classList.remove('nav-open');
                if (backdrop) backdrop.classList.remove('visible');
                if (hamburger) hamburger.style.display = '';
            });
        }

        var langBtn = document.getElementById('nav-lang-btn');
        if (langBtn) {
            langBtn.addEventListener('click', function () {
                var curr = window.i18n ? window.i18n.getLang() : 'es';
                var next = curr === 'es' ? 'en' : 'es';
                if (window.i18n) window.i18n.setLang(next);
                if (_navUserRole !== 'guest') {
                    api.put('/api/settings', { language: next }).catch(function () { });
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

    // ── Hamburger móvil ───────────────────────────────────────────────────
    if (!document.getElementById('nav-hamburger')) {
        var _hamburger = document.createElement('button');
        _hamburger.id = 'nav-hamburger';
        _hamburger.className = 'nav-hamburger';
        _hamburger.setAttribute('aria-label', 'Abrir menú');
        _hamburger.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none">'
            + '<path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'
            + '</svg>';
        document.body.appendChild(_hamburger);

        var _backdrop = document.createElement('div');
        _backdrop.id = 'nav-backdrop';
        _backdrop.className = 'nav-backdrop';
        document.body.appendChild(_backdrop);

        function _openNav() {
            var nav = document.querySelector('.main-nav');
            if (nav) nav.classList.add('nav-open');
            _backdrop.classList.add('visible');
            _hamburger.style.display = 'none';
            _hamburger.setAttribute('aria-expanded', 'true');
        }
        function _closeNav() {
            var nav = document.querySelector('.main-nav');
            if (nav) nav.classList.remove('nav-open');
            _backdrop.classList.remove('visible');
            _hamburger.style.display = '';
            _hamburger.setAttribute('aria-expanded', 'false');
        }
        function _toggleNav() {
            var nav = document.querySelector('.main-nav');
            if (nav && nav.classList.contains('nav-open')) { _closeNav(); } else { _openNav(); }
        }

        _hamburger.addEventListener('click', _toggleNav);
        _backdrop.addEventListener('click', _closeNav);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') _closeNav(); });
        window.addEventListener('resize', function () { if (window.innerWidth > 768) _closeNav(); });
    }
}

window.renderNav = renderNav;
