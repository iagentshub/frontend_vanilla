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
        // Solo sincronizar tema desde servidor para usuarios no invitados
        if (d.role !== 'guest' && window._syncThemeFromServer) {
            window._syncThemeFromServer();
        }
        document.body.style.visibility = '';
    } catch (e) {
        window.location.replace('/login/');
    }
};
