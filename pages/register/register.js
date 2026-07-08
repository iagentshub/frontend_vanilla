'use strict';

// Redirigir a login si el registro está cerrado
fetch('/api/settings/platform/public')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
        if (cfg && cfg.registration === 'closed') {
            window.location.replace('/login/');
        }
    })
    .catch(function () { });

var _EYE_OPEN = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>';
var _EYE_CLOSED = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="3" x2="15" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

function bindPasswordToggle(buttonId, inputId) {
    const btn = document.getElementById(buttonId);
    const inp = document.getElementById(inputId);
    if (!btn || !inp) return;
    btn.innerHTML = _EYE_OPEN;
    btn.addEventListener('click', function () {
        const showing = inp.type === 'text';
        inp.type = showing ? 'password' : 'text';
        btn.innerHTML = showing ? _EYE_OPEN : _EYE_CLOSED;
        btn.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });
}

bindPasswordToggle('toggle-reg-pw', 'reg-pw');
bindPasswordToggle('toggle-reg-pw2', 'reg-pw2');

var _email = '', _password = '', _plan = '';

// ── Step 1: credentials ────────────────────────────────────────────────────
document.getElementById('reg-form-1').addEventListener('submit', function(e) {
    e.preventDefault();
    const errEl = document.getElementById('reg-error-1');
    errEl.style.display = 'none';
    const email = document.getElementById('reg-email').value.trim();
    const pw    = document.getElementById('reg-pw').value;
    const pw2   = document.getElementById('reg-pw2').value;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = 'Email inválido'; errEl.style.display = ''; return;
    }
    if (pw.length < 8) {
        errEl.textContent = 'La contraseña debe tener al menos 8 caracteres'; errEl.style.display = ''; return;
    }
    if (pw !== pw2) {
        errEl.textContent = 'Las contraseñas no coinciden'; errEl.style.display = ''; return;
    }
    _email = email; _password = pw; _plan = 'free';
    document.getElementById('step-1').style.display = 'none';
    document.getElementById('step-2').style.display = 'none';
    document.getElementById('step-3').style.display = '';
    document.getElementById('step-num').textContent = '2';
});

// ── Step 2: plan selection ─────────────────────────────────────────────────
document.querySelectorAll('.reg-plan-card').forEach(function(card) {
    card.addEventListener('click', function() {
        document.querySelectorAll('.reg-plan-card').forEach(function(c) {
            c.classList.remove('selected');
        });
        this.classList.add('selected');
        _plan = this.dataset.plan;
        document.getElementById('reg-error-plan').style.display = 'none';
    });
});

document.getElementById('btn-plan-next').addEventListener('click', function() {
    if (!_plan) {
        document.getElementById('reg-error-plan').style.display = '';
        return;
    }
    document.getElementById('step-2').style.display = 'none';
    document.getElementById('step-3').style.display = '';
    document.getElementById('step-num').textContent = '3';
});

// ── Step 3: profile + submit ───────────────────────────────────────────────
async function _doRegister() {
    const errEl = document.getElementById('reg-error-2');
    errEl.style.display = 'none';
    const payload = { email: _email, password: _password, plan: _plan };
    const birth   = document.getElementById('reg-birth').value;
    const gender  = document.getElementById('reg-gender').value;
    const country = document.getElementById('reg-country').value;
    const phone   = document.getElementById('reg-phone').value.trim();
    if (birth)   payload.birth_date = birth;
    if (gender)  payload.gender     = gender;
    if (country) payload.country    = country;
    if (phone)   payload.phone      = phone;

    const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (r.ok) {
        const data = await r.json().catch(() => ({}));
        if (data.pending_verification) {
            document.querySelector('.login-card').innerHTML =
                '<div class="login-card-logo">iA</div>' +
                '<h2 style="margin-bottom:8px">Revisa tu correo</h2>' +
                '<p class="login-sub" style="margin-bottom:24px">Hemos enviado un enlace de verificación a <strong>' + (data.email || '') + '</strong></p>' +
                '<p style="font-size:13px;color:var(--ink-2,#888);line-height:1.6">Haz clic en el enlace del correo para activar tu cuenta.<br>Revisa también la carpeta de spam si no lo ves.</p>' +
                '<a href="/login/" class="btn btn-ghost btn-full" style="margin-top:24px;display:block;text-align:center">Volver al login</a>';
        } else {
            window.location.replace('/dashboard/');
        }
    } else {
        const data = await r.json().catch(() => ({}));
        errEl.textContent = data.detail || 'Error al crear la cuenta';
        errEl.style.display = '';
    }
}

document.getElementById('btn-finish').addEventListener('click', _doRegister);
document.getElementById('btn-skip').addEventListener('click', _doRegister);
