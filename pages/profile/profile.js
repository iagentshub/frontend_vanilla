// profile.js
'use strict';

var _currentRole = 'standard';

function _getRoleLabel(role) {
    return t('profile.roles.' + role) || role;
}

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
    bindEvents();
}

async function loadUser() {
    try {
        var r = await fetch('/api/auth/me');
        var d = await r.json();
        var u = d.username || '';
        _currentRole = d.role || 'standard';

        var elName = document.getElementById('profile-username');
        var elRole = document.getElementById('profile-role');
        var elAvatar = document.getElementById('profile-avatar');
        if (elName) elName.textContent = u;
        if (elRole) elRole.textContent = _getRoleLabel(_currentRole);
        if (elAvatar) elAvatar.textContent = u.charAt(0).toUpperCase() || '?';

        // Ocultar cambio de contraseña para invitados
        if (_currentRole === 'guest') {
            var pwCard = document.getElementById('password-card');
            if (pwCard) pwCard.style.display = 'none';
        }
    } catch (e) { }
}

async function renderThemePicker() {
    var container = document.getElementById('theme-picker');
    if (!container || !window.THEMES) return;

    // Cargar tema desde servidor solo si no es invitado
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

    container.innerHTML = window.THEMES.map(function (t) {
        var active = current === t.id;
        return '<div class="theme-swatch' + (active ? ' theme-swatch--active' : '') + '" data-theme-pick="' + t.id + '">' +
            '<div class="theme-swatch-preview" style="--swatch-bg:' + t.bg + ';--swatch-accent:' + t.accent + '"></div>' +
            '<span class="theme-swatch-name">' + t.name + '</span>' +
            '</div>';
    }).join('');

    container.querySelectorAll('[data-theme-pick]').forEach(function (sw) {
        sw.addEventListener('click', async function () {
            var themeId = sw.dataset.themePick;
            window.setTheme(themeId);
            container.querySelectorAll('.theme-swatch').forEach(function (s) {
                s.classList.toggle('theme-swatch--active', s.dataset.themePick === themeId);
            });
            // Solo persistir en servidor si no es invitado
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

    var current = window.i18n.getLang();

    function _render() {
        current = window.i18n.getLang();
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

function bindEvents() {
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
