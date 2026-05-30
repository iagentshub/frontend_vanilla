// docs.js — Página de documentación (standalone, sin auth requerida)
'use strict';

var _SECTIONS = [
    { id: 'keywords',         key: 'keywords' },
    { id: 'getting-started',  key: 'getting_started' },
    { id: 'agents',           key: 'agents' },
    { id: 'connections',      key: 'connections' },
    { id: 'skills',           key: 'skills' },
    { id: 'teams',            key: 'teams' },
    { id: 'memory-knowledge', key: 'memory_knowledge' },
    { id: 'best-practices',   key: 'best_practices' },
];

function init() {
    _checkAuthForHeader();
    _initLangBtn();
    _initScrollSpy();

    if (window.i18n) {
        window.i18n.ready(function () { _render(); _syncLangBtn(); });
        window.i18n.onLangChange(function () { _render(); _syncLangBtn(); });
    } else {
        _render();
    }
}

function _checkAuthForHeader() {
    fetch('/api/auth/me')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
            var btn = document.getElementById('docs-header-action');
            if (!btn || !d || !d.username) return;
            btn.href = '/dashboard';
            btn.setAttribute('data-i18n', '');
            btn.textContent = '← Dashboard';
        })
        .catch(function () {});
}

function _initLangBtn() {
    var btn = document.getElementById('docs-lang-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
        var curr = window.i18n ? window.i18n.getLang() : 'es';
        if (window.i18n) window.i18n.setLang(curr === 'es' ? 'en' : 'es');
    });
}

function _syncLangBtn() {
    var btn = document.getElementById('docs-lang-btn');
    if (btn && window.i18n) btn.textContent = window.i18n.getLang().toUpperCase();
}

function _render() {
    _renderNav();
    _renderContent();
    if (window.i18n) window.i18n.applyDOM();
}

function _renderNav() {
    var nav = document.getElementById('docs-nav');
    if (!nav) return;
    nav.innerHTML = _SECTIONS.map(function (s) {
        return '<a href="#' + s.id + '" class="docs-nav-link" data-section="' + s.id + '">' +
            t('docs.nav.' + s.key) +
            '</a>';
    }).join('');

    nav.querySelectorAll('.docs-nav-link').forEach(function (link) {
        link.addEventListener('click', function () {
            var section = document.getElementById(link.getAttribute('data-section'));
            if (!section) return;
            var details = section.querySelector('details');
            if (details) details.open = true;
        });
    });
}

function _renderContent() {
    var el = document.getElementById('docs-content');
    if (!el) return;
    el.innerHTML = _SECTIONS.map(_buildSection).join('');

    el.querySelectorAll('details').forEach(function (details) {
        details.addEventListener('toggle', function () {
            if (!details.open) return;
            el.querySelectorAll('details').forEach(function (other) {
                if (other !== details) other.open = false;
            });
        });
    });
}

function _buildSection(s) {
    var k = s.key;
    var body;

    if (k === 'keywords') {
        var terms = ['agent', 'llm', 'prompt', 'connection', 'provider', 'skill', 'memory', 'knowledge', 'token', 'temperature', 'context_window', 'hallucination', 'tools', 'rag', 'fine_tuning', 'multimodal'];
        body = '<div class="docs-glossary">' +
            terms.map(function (term) {
                return '<div class="docs-term">' +
                    '<strong>' + t('docs.keywords.' + term + '_title') + '</strong>' +
                    '<p>' + t('docs.keywords.' + term + '_body') + '</p>' +
                    '</div>';
            }).join('') +
            '</div>';
    } else if (k === 'getting_started') {
        body = '<div class="docs-accounts">' +
            '<strong class="docs-accounts-title">' + t('docs.getting_started.accounts_title') + '</strong>' +
            _account('registered', t('docs.getting_started.accounts_registered_title'), t('docs.getting_started.accounts_registered_body')) +
            _account('guest',      t('docs.getting_started.accounts_guest_title'),      t('docs.getting_started.accounts_guest_body')) +
            '</div>' +
            '<p class="docs-intro">' + t('docs.getting_started.intro') + '</p>' +
            '<div class="docs-steps">' +
            _step(t('docs.getting_started.step1_title'), t('docs.getting_started.step1_body')) +
            _step(t('docs.getting_started.step2_title'), t('docs.getting_started.step2_body')) +
            _step(t('docs.getting_started.step3_title'), t('docs.getting_started.step3_body')) +
            '</div>';
    } else if (k === 'agents') {
        body = '<p class="docs-intro">' + t('docs.agents.intro') + '</p>' +
            _item(t('docs.agents.test_title'),     t('docs.agents.test_body')) +
            _item(t('docs.agents.export_title'),   t('docs.agents.export_body')) +
            _item(t('docs.agents.config_title'),   t('docs.agents.config_body')) +
            _item(t('docs.agents.memory_title'),   t('docs.agents.memory_body')) +
            _item(t('docs.agents.routines_title'), t('docs.agents.routines_body'));
    } else if (k === 'connections') {
        body = '<p class="docs-intro">' + t('docs.connections.intro') + '</p>' +
            _item(t('docs.connections.vs_accounts_title'), t('docs.connections.vs_accounts_body')) +
            _item(t('docs.connections.tokens_title'),      t('docs.connections.tokens_body'));
    } else if (k === 'skills') {
        body = '<p class="docs-intro">' + t('docs.skills.intro') + '</p>' +
            _item(t('docs.skills.public_title'),   t('docs.skills.public_body')) +
            _item(t('docs.skills.private_title'),  t('docs.skills.private_body')) +
            _item(t('docs.skills.activate_title'), t('docs.skills.activate_body'));
    } else if (k === 'teams') {
        body = '<p class="docs-intro">' + t('docs.teams.intro') + '</p>' +
            _item(t('docs.teams.create_title'),  t('docs.teams.create_body')) +
            _item(t('docs.teams.invite_title'),  t('docs.teams.invite_body')) +
            _item(t('docs.teams.share_title'),   t('docs.teams.share_body')) +
            _item(t('docs.teams.badge_title'),   t('docs.teams.badge_body')) +
            _item(t('docs.teams.guests_title'),  t('docs.teams.guests_body'));
    } else if (k === 'memory_knowledge') {
        body = '<p class="docs-intro">' + t('docs.memory_knowledge.intro') + '</p>' +
            _item(t('docs.memory_knowledge.memory_title'),    t('docs.memory_knowledge.memory_body')) +
            _item(t('docs.memory_knowledge.knowledge_title'), t('docs.memory_knowledge.knowledge_body'));
    } else if (k === 'best_practices') {
        body = '<p class="docs-intro">' + t('docs.best_practices.intro') + '</p>' +
            _item(t('docs.best_practices.prompt_title'),    t('docs.best_practices.prompt_body')) +
            _item(t('docs.best_practices.model_title'),     t('docs.best_practices.model_body')) +
            _item(t('docs.best_practices.skills_title'),    t('docs.best_practices.skills_body')) +
            _item(t('docs.best_practices.knowledge_title'), t('docs.best_practices.knowledge_body')) +
            _item(t('docs.best_practices.memory_title'),    t('docs.best_practices.memory_body')) +
            _item(t('docs.best_practices.temp_title'),      t('docs.best_practices.temp_body'));
    }

    return '<section class="docs-section" id="' + s.id + '">' +
        '<details>' +
        '<summary>' + t('docs.sections.' + k) + '</summary>' +
        '<div class="docs-section-body">' + body + '</div>' +
        '</details>' +
        '</section>';
}

function _account(type, title, body) {
    var icon = type === 'registered'
        ? '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 14v-.5A5.5 5.5 0 0 1 8 8a5.5 5.5 0 0 1 5.5 5.5V14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
        : '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 1.5"/><path d="M2.5 14v-.5A5.5 5.5 0 0 1 8 8a5.5 5.5 0 0 1 5.5 5.5V14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="3 2"/></svg>';
    return '<div class="docs-account docs-account--' + type + '">' +
        '<span class="docs-account-icon">' + icon + '</span>' +
        '<div><strong>' + title + '</strong><p>' + body + '</p></div>' +
        '</div>';
}

function _item(title, body) {
    return '<div class="docs-item"><strong>' + title + '</strong><p>' + body + '</p></div>';
}

function _step(title, body) {
    return '<div class="docs-step"><strong>' + title + '</strong><p>' + body + '</p></div>';
}

function _initScrollSpy() {
    if (!window.IntersectionObserver) return;
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            var link = document.querySelector('.docs-nav-link[data-section="' + entry.target.id + '"]');
            if (link) link.classList.toggle('active', entry.isIntersecting);
        });
    }, { rootMargin: '-10% 0px -75% 0px' });

    _SECTIONS.forEach(function (s) {
        var el = document.getElementById(s.id);
        if (el) observer.observe(el);
    });
}

init();
