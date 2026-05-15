// auth.js — guard de autenticación
'use strict';

// Ocultar el body inmediatamente para evitar el flash de contenido
// protegido antes de que se compruebe la sesión.
document.body.style.visibility = 'hidden';

window.requireAuth = async function () {
    try {
        var r = await fetch((window.API_BASE || '') + '/api/auth/me');
        if (!r.ok) { window.location.replace('/login/'); return; }
        var d = await r.json();
        if (d.role !== 'guest') {
            fetch((window.API_BASE || '') + '/api/settings')
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (s) {
                    if (!s) return;
                    if (s.theme && window.setTheme && s.theme !== window.getTheme()) window.setTheme(s.theme);
                    if (s.language && window.i18n && s.language !== window.i18n.getLang()) window.i18n.setLang(s.language);
                })
                .catch(function () {});
        }
        document.body.style.visibility = '';
    } catch (e) {
        window.location.replace('/login/');
    }
};
