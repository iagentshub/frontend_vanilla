// profile.js
'use strict';

var _currentRole = 'standard';
var _authMethod = 'internal';

var _LANGS = [
    { id: 'es', label: 'Español', flag: '🇪🇸' },
    { id: 'en', label: 'English', flag: '🇬🇧' },
];

var _ALL_LANGS = [
    { id: 'es', label: 'Español', flag: '🇪🇸' },
    { id: 'en', label: 'English', flag: '🇬🇧' },
    { id: 'fr', label: 'Français', flag: '🇫🇷' },
    { id: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { id: 'pt', label: 'Português', flag: '🇵🇹' },
    { id: 'it', label: 'Italiano', flag: '🇮🇹' },
    { id: 'zh', label: '中文', flag: '🇨🇳' },
    { id: 'ja', label: '日本語', flag: '🇯🇵' },
    { id: 'ar', label: 'العربية', flag: '🇸🇦' },
];

async function init() {
    renderNav('nav-root', 'profile');
    await window.requireAuth();
    await loadUser();
    await renderThemePicker();
    await renderLangPicker();
    renderDensityPicker();
    renderPreferences();
    bindPasswordForm();
    bindNavItems();
    // Ocultar tab Suscripción si la facturación está desactivada en la config
    api.get('/api/settings/platform/public').then(function (cfg) {
        var billingNavBtn = document.getElementById('nav-billing');
        if (billingNavBtn && cfg.billing_enabled === false) {
            billingNavBtn.style.display = 'none';
        }
    }).catch(function () { });
}

async function loadUser() {
    try {
        var d = await api.get('/api/auth/me');
        var u = d.username || '';
        _currentRole = d.role || 'standard';
        _authMethod = d.auth_method || 'internal';

        var elName = document.getElementById('profile-username');
        var elRole = document.getElementById('profile-role');
        var elAuth = document.getElementById('profile-auth-method');
        if (elName) elName.textContent = u;
        _setAvatarLetter(u);
        _loadAvatar(u);

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

        if (typeof window.initAvatarCrop === 'function') window.initAvatarCrop(u);
        _initSocialForm(u);
    } catch (e) { }
}

function _initSocialForm(username) {
    var grid = document.getElementById('social-lang-grid');
    var bioEl = document.getElementById('social-bio');
    var bioCount = document.getElementById('social-bio-count');
    var emailEl = document.getElementById('social-email');
    var githubEl = document.getElementById('social-github');
    var cvEl = document.getElementById('social-cv');
    var form = document.getElementById('social-form');
    var saveBtn = document.getElementById('social-save-btn');
    var profileLink = document.getElementById('social-view-profile-link');

    if (!form) return;

    if (profileLink) profileLink.href = '/u/' + encodeURIComponent(username);

    // Render language checkboxes
    if (grid) {
        grid.innerHTML = _ALL_LANGS.map(function (l) {
            return '<label class="social-lang-item">' +
                '<input type="checkbox" name="lang" value="' + l.id + '">' +
                '<span>' + l.flag + '</span>' +
                '<span>' + l.label + '</span>' +
                '</label>';
        }).join('');
    }

    // Bio counter
    if (bioEl && bioCount) {
        bioEl.addEventListener('input', function () {
            bioCount.textContent = bioEl.value.length;
        });
    }

    // Load current values
    api.get('/api/users/' + encodeURIComponent(username))
        .then(function (d) {
            if (bioEl) { bioEl.value = d.bio || ''; if (bioCount) bioCount.textContent = bioEl.value.length; }
            if (emailEl) emailEl.value = d.email_public || '';
            if (githubEl) githubEl.value = d.github || '';
            if (cvEl) cvEl.value = d.cv || '';
            var selected = d.languages || [];
            if (grid) {
                grid.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
                    cb.checked = selected.indexOf(cb.value) !== -1;
                });
            }
        })
        .catch(function () { });

    // Save
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var langs = [];
        if (grid) {
            grid.querySelectorAll('input:checked').forEach(function (cb) { langs.push(cb.value); });
        }
        saveBtn.disabled = true;
        saveBtn.textContent = t('common.saving') || 'Guardando…';
        api.put('/api/auth/me/profile', {
            bio: bioEl ? bioEl.value.trim() : null,
            languages: langs,
            email_public: emailEl ? emailEl.value.trim() : null,
            github: githubEl ? githubEl.value.trim() : null,
            cv: cvEl ? cvEl.value : null,
        }).then(function () {
            toast(t('profile.social.saved') || 'Perfil guardado', 'success');
        }).catch(function () {
            toast(t('profile.social.error') || 'Error al guardar', 'error');
        }).finally(function () {
            saveBtn.disabled = false;
            saveBtn.textContent = t('profile.social.save_btn') || 'Guardar perfil';
        });
    });
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
    if (!window.THEMES) return;

    if (_currentRole !== 'guest') {
        try {
            var s = await api.get('/api/settings');
            if (s.theme) window.setTheme(s.theme);
        } catch (e) { }
    }

    var _MODES = [
        { id: 'dark', labelKey: 'profile.theme_dark', fallback: 'Oscuro', bg: '#0A0A0A' },
        { id: 'light', labelKey: 'profile.theme_light', fallback: 'Claro', bg: '#F5F5F7' },
    ];
    var _ACCENTS = [
        { id: 'red', labelKey: 'profile.theme_red', fallback: 'Rojo' },
        { id: 'blue', labelKey: 'profile.theme_blue', fallback: 'Azul' },
        { id: 'orange', labelKey: 'profile.theme_orange', fallback: 'Naranja' },
        { id: 'purple', labelKey: 'profile.theme_purple', fallback: 'Morado' },
    ];

    function _curMode() { return window.getTheme().split('-')[0]; }
    function _curAccent() { return window.getTheme().split('-')[1]; }

    function _accentColor(accentId) {
        var th = window.THEMES.find(function (t) { return t.id === _curMode() + '-' + accentId; });
        return th ? th.accentColor : '#888';
    }

    var checkSvg = '<svg class="lang-check" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    async function _pick(mode, accent) {
        window.setTheme(mode + '-' + accent);
        _renderMode();
        _renderAccent();
        if (_currentRole !== 'guest') {
            try {
                await api.put('/api/settings', { theme: mode + '-' + accent });
            } catch (e) { }
        }
    }

    function _renderMode() {
        var container = document.getElementById('theme-mode-picker');
        if (!container) return;
        var cur = _curMode();
        container.innerHTML = _MODES.map(function (m) {
            var active = cur === m.id;
            return '<button type="button" class="theme-mode-btn' + (active ? ' theme-mode-btn--active' : '') + '" data-mode="' + m.id + '">' +
                '<span class="theme-mode-dot" style="background:' + m.bg + '"></span>' +
                (t(m.labelKey) || m.fallback) +
                (active ? checkSvg : '') +
                '</button>';
        }).join('');
        container.querySelectorAll('[data-mode]').forEach(function (btn) {
            btn.addEventListener('click', function () { _pick(btn.dataset.mode, _curAccent()); });
        });
    }

    function _renderAccent() {
        var container = document.getElementById('theme-accent-picker');
        if (!container) return;
        var cur = _curAccent();
        container.innerHTML = _ACCENTS.map(function (a) {
            var active = cur === a.id;
            return '<button type="button" class="theme-accent-btn' + (active ? ' theme-accent-btn--active' : '') + '" data-accent="' + a.id + '" title="' + (t(a.labelKey) || a.fallback) + '">' +
                '<span class="theme-accent-dot" style="background:' + _accentColor(a.id) + '"></span>' +
                (t(a.labelKey) || a.fallback) +
                (active ? checkSvg : '') +
                '</button>';
        }).join('');
        container.querySelectorAll('[data-accent]').forEach(function (btn) {
            btn.addEventListener('click', function () { _pick(_curMode(), btn.dataset.accent); });
        });
    }

    _renderMode();
    _renderAccent();
}

async function renderLangPicker() {
    var container = document.getElementById('lang-picker');
    if (!container || !window.i18n) return;

    if (_currentRole !== 'guest') {
        try {
            var s = await api.get('/api/settings');
            if (s.language && s.language !== window.i18n.getLang()) window.i18n.setLang(s.language);
        } catch (e) { }
    }

    window.i18n.onLangChange(function () { _render(); });

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
            btn.addEventListener('click', async function () {
                var lang = btn.dataset.lang;
                if (lang === window.i18n.getLang()) return;
                window.i18n.setLang(lang);
                _render();
                if (_currentRole !== 'guest') {
                    try {
                        await api.put('/api/settings', { language: lang });
                    } catch (e) { }
                }
            });
        });
    }

    _render();
}

function renderDensityPicker() {
    var container = document.getElementById('density-picker');
    var preview = document.getElementById('density-preview');
    if (!container) return;
    var options = [
        { id: 'normal', labelKey: 'profile.density_normal', fallback: 'Normal' },
        { id: 'compact', labelKey: 'profile.density_compact', fallback: 'Compacto' },
    ];
    var checkSvg = '<svg class="lang-check" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    function _applyPreview(val) {
        if (!preview) return;
        preview.classList.toggle('density-preview--compact', val === 'compact');
    }

    function _render() {
        var cur = localStorage.getItem('ga-chat-density') || 'normal';
        container.innerHTML = options.map(function (o) {
            var active = cur === o.id;
            return '<button type="button" class="density-option' + (active ? ' density-option--active' : '') + '" data-density="' + o.id + '">' +
                (t(o.labelKey) || o.fallback) +
                (active ? checkSvg : '') +
                '</button>';
        }).join('');
        _applyPreview(cur);
        container.querySelectorAll('[data-density]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                localStorage.setItem('ga-chat-density', btn.dataset.density);
                _render();
            });
        });
    }
    _render();
}

function renderPreferences() {
    var timeoutEl = document.getElementById('pref-timeout');
    if (timeoutEl) {
        timeoutEl.value = localStorage.getItem('ga-chat-timeout') || '0';
        timeoutEl.addEventListener('change', function () {
            localStorage.setItem('ga-chat-timeout', timeoutEl.value);
        });
    }

    var sendEnterEl = document.getElementById('pref-send-enter');
    if (sendEnterEl) {
        sendEnterEl.checked = localStorage.getItem('ga-send-on-enter') !== 'false';
        sendEnterEl.addEventListener('change', function () {
            localStorage.setItem('ga-send-on-enter', sendEnterEl.checked ? 'true' : 'false');
        });
    }

    var pageSizeEl = document.getElementById('pref-page-size');
    if (pageSizeEl) {
        var stored = localStorage.getItem('ga-page-size') || '24';
        pageSizeEl.value = stored;
        pageSizeEl.addEventListener('change', function () {
            localStorage.setItem('ga-page-size', pageSizeEl.value);
        });
    }
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

function _setAvatarLetter(username) {
    var el = document.getElementById('profile-avatar-letter');
    if (el) el.textContent = (username || '?').charAt(0).toUpperCase();
}

function _setAvatarImg(url) {
    var wrap = document.getElementById('profile-avatar');
    if (!wrap) return;
    var existing = wrap.querySelector('img');
    if (existing) existing.remove();
    var letter = document.getElementById('profile-avatar-letter');
    var img = document.createElement('img');
    img.src = url + '?t=' + Date.now();
    img.alt = '';
    img.onerror = function () {
        img.remove();
        if (letter) letter.style.display = '';
    };
    img.onload = function () {
        if (letter) letter.style.display = 'none';
    };
    wrap.insertBefore(img, wrap.firstChild);
}

function _loadAvatar(username) {
    var url = '/api/users/' + encodeURIComponent(username) + '/avatar';
    fetch(url, { credentials: 'include' }).then(function (r) {
        if (r.ok && r.status !== 204) {
            _setAvatarImg(url);
        }
    }).catch(function () { });
}

init();
