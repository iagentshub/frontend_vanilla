'use strict';

// Post-login redirect target — solo rutas internas (evita open redirect)
function _redirectTarget() {
    const raw = new URLSearchParams(window.location.search).get('redirect') || '';
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return '/dashboard/';
}

document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');

    errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = window.t ? window.t('auth.login_btn_loading') : 'Entrando…';

    try {
        const r = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (r.ok) {
            window.location.replace(_redirectTarget());
        } else {
            const data = await r.json().catch(() => ({}));
            errEl.textContent = data.detail || (window.t ? window.t('auth.error_invalid') : 'Credenciales incorrectas');
            errEl.style.display = '';
        }
    } catch {
        errEl.textContent = window.t ? window.t('auth.error_connection') : 'Error de conexión';
        errEl.style.display = '';
    } finally {
        btn.disabled = false;
        btn.textContent = window.t ? window.t('auth.login_btn') : 'Entrar';
    }
});

// Password toggle
var _EYE_OPEN = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>';
var _EYE_CLOSED = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="3" x2="15" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
document.getElementById('toggle-pw')?.addEventListener('click', function () {
    const inp = document.getElementById('login-password');
    const showing = inp.type === 'text';
    inp.type = showing ? 'password' : 'text';
    this.innerHTML = showing ? _EYE_OPEN : _EYE_CLOSED;
    this.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
});

// Guest login
document.getElementById('btn-guest')?.addEventListener('click', async function () {
    const btn = this;
    btn.disabled = true;
    try {
        const r = await fetch('/api/auth/guest', { method: 'POST' });
        if (r.ok) window.location.replace(_redirectTarget());
    } finally {
        btn.disabled = false;
    }
});

// Redirect if already logged in
fetch('/api/auth/me').then(r => {
    if (r.ok) window.location.replace(_redirectTarget());
});

// Aplicar configuración de plataforma (invitado / registro / facturación).
// Los elementos están ocultos por defecto en el HTML — aquí los mostramos
// solo si la API confirma que deben ser visibles. Así nunca hay parpadeo.
fetch('/api/settings/platform/public').then(r => r.ok ? r.json() : null).then(function (cfg) {
    if (!cfg) return;

    // Acceso como invitado
    if (cfg.guest_enabled) {
        var guestBtn = document.getElementById('btn-guest');
        var divider = document.querySelector('.login-divider');
        if (guestBtn) guestBtn.style.display = '';
        if (divider) divider.style.display = '';
    }

    // Link "¿No tienes cuenta? Crear cuenta"
    // Solo visible cuando el registro es abierto Y la facturación está desactivada.
    var showRegister = cfg.registration === 'open' && cfg.billing_enabled === false;
    var registerLink = document.querySelector('.login-register-link');
    if (registerLink) registerLink.style.display = showRegister ? '' : 'none';

    // Link de precios (solo visible con billing activado)
    if (cfg.billing_enabled) {
        document.querySelectorAll('a[href="/pricing/"]').forEach(function (a) {
            a.style.display = '';
        });
    }

    // Limpiar separadores vacíos en el footer de links
    document.querySelectorAll('.login-explore-sep').forEach(function (sep) {
        var prev = sep.previousElementSibling;
        var next = sep.nextElementSibling;
        if ((prev && prev.style.display === 'none') || (next && next.style.display === 'none')) {
            sep.style.display = 'none';
        }
    });
}).catch(function () { });
