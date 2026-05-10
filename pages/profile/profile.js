// profile.js
'use strict';

var _currentRole = 'standard';
var _authMethod = 'internal';

var _LANGS = [
    { id: 'es', label: 'Español', flag: '🇪🇸' },
    { id: 'en', label: 'English', flag: '🇬🇧' },
];

async function init() {
    await window.requireAuth();
    renderNav('nav-root', 'profile');
    await loadUser();
    await renderThemePicker();
    renderLangPicker();
    bindPasswordForm();
    bindNavItems();
}

async function loadUser() {
    try {
        var r = await fetch('/api/auth/me');
        var d = await r.json();
        var u = d.username || '';
        _currentRole = d.role || 'standard';
        _authMethod = d.auth_method || 'internal';

        var elName = document.getElementById('profile-username');
        var elRole = document.getElementById('profile-role');
        var elAuth = document.getElementById('profile-auth-method');
        var elAvatar = document.getElementById('profile-avatar');
        if (elName) elName.textContent = u;
        if (elAvatar) elAvatar.textContent = u.charAt(0).toUpperCase() || '?';

        var roleLabel = t('profile.roles.' + _currentRole) || _currentRole;
        if (elRole) elRole.textContent = roleLabel;

        var authLabel = t('profile.auth_method.' + _authMethod) || _authMethod;
        if (elAuth) {
            elAuth.textContent = authLabel;
            elAuth.style.display = _authMethod !== 'internal' ? '' : 'none';
        }

        var elUserDet = document.getElementById('profile-username-detail');
        var elRoleDet = document.getElementById('profile-role-detail');
        var elAuthDet = document.getElementById('profile-auth-detail');
        if (elUserDet) elUserDet.textContent = u;
        if (elRoleDet) elRoleDet.textContent = roleLabel;
        if (elAuthDet) elAuthDet.textContent = authLabel;

        _initNav(_authMethod);
    } catch (e) { }
}

function _initNav(authMethod) {
    // Hide password form for non-internal accounts (oauth or guest)
    var pwCard = document.getElementById('password-card');
    if (pwCard) pwCard.style.display = authMethod === 'internal' ? '' : 'none';
}

function _switchSection(targetId) {
    document.querySelectorAll('.profile-section').forEach(function (sec) {
        sec.hidden = sec.id !== targetId;
    });
    document.querySelectorAll('.profile-nav-item').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.section === targetId);
    });
}

function bindNavItems() {
    document.querySelectorAll('.profile-nav-item[data-section]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            _switchSection(btn.dataset.section);
        });
    });
}

async function renderThemePicker() {
    var container = document.getElementById('theme-picker');
    if (!container || !window.THEMES) return;

    if (_currentRole !== 'guest') {
        try {
            var r = await fetch('/api/settings');
            if (r.ok) {
                var s = await r.json();
                if (s.theme) window.setTheme(s.theme);
            }
        } catch (e) { }
    }

    var current = window.getTheme();

    container.innerHTML = window.THEMES.map(function (th) {
        var active = current === th.id;
        return '<div class="theme-swatch' + (active ? ' theme-swatch--active' : '') + '" data-theme-pick="' + th.id + '">' +
            '<div class="theme-swatch-preview" style="--swatch-bg:' + th.bg + ';--swatch-accent:' + th.accent + '"></div>' +
            '<span class="theme-swatch-name">' + th.name + '</span>' +
            '</div>';
    }).join('');

    container.querySelectorAll('[data-theme-pick]').forEach(function (sw) {
        sw.addEventListener('click', async function () {
            var themeId = sw.dataset.themePick;
            window.setTheme(themeId);
            container.querySelectorAll('.theme-swatch').forEach(function (s) {
                s.classList.toggle('theme-swatch--active', s.dataset.themePick === themeId);
            });
            if (_currentRole !== 'guest') {
                try {
                    await fetch('/api/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ theme: themeId }),
                    });
                } catch (e) { }
            }
        });
    });
}

function renderLangPicker() {
    var container = document.getElementById('lang-picker');
    if (!container || !window.i18n) return;

    function _render() {
        var current = window.i18n.getLang();
        container.innerHTML = _LANGS.map(function (l) {
            var active = current === l.id;
            return '<button type="button" class="lang-option' + (active ? ' lang-option--active' : '') + '" data-lang="' + l.id + '">' +
                '<span class="lang-flag">' + l.flag + '</span>' +
                '<span class="lang-label">' + l.label + '</span>' +
                (active ? '<svg class="lang-check" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') +
                '</button>';
        }).join('');

        container.querySelectorAll('[data-lang]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var lang = btn.dataset.lang;
                if (lang === window.i18n.getLang()) return;
                window.i18n.setLang(lang).then(function () { _render(); });
            });
        });
    }

    _render();
}

function bindPasswordForm() {
    var form = document.getElementById('password-form');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var current = document.getElementById('pw-current').value;
        var newPw = document.getElementById('pw-new').value;
        var confirm = document.getElementById('pw-confirm').value;
        if (!current || !newPw || !confirm) {
            toast(t('profile.password.fill_all'), 'error'); return;
        }
        if (newPw !== confirm) {
            toast(t('profile.password.mismatch'), 'error'); return;
        }
        var btn = document.getElementById('pw-save-btn');
        btn.disabled = true; btn.textContent = t('profile.password.saving');
        try {
            await api.post('/api/auth/change-password', { current_password: current, new_password: newPw });
            toast(t('profile.password.saved'), 'success');
            form.reset();
        } catch (err) {
            toast(err.message || t('profile.password.error'), 'error');
        } finally {
            btn.disabled = false; btn.textContent = t('profile.password.save_btn');
        }
    });
}

init();
