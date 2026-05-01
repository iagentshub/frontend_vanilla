// button_login_guest.js — Botón de acceso como invitado
'use strict';

function renderGuestLoginButton(mountId, apiBase) {
    var mount = document.getElementById(mountId);
    if (!mount) return;

    var loginLabel   = window.t ? window.t('auth.guest_login')   : 'Acceder como invitado';
    var enteringLabel = window.t ? window.t('auth.guest_entering') : 'Entrando…';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-guest';
    btn.innerHTML = '<span class="btn-guest__label">' + loginLabel + '</span>';

    btn.addEventListener('click', async function () {
        btn.setAttribute('aria-busy', 'true');
        btn.querySelector('.btn-guest__label').textContent = enteringLabel;
        try {
            var r = await fetch((apiBase || '') + '/api/auth/guest', { method: 'POST' });
            if (r.ok) {
                window.location.replace('/agents/');
            } else {
                btn.removeAttribute('aria-busy');
                btn.querySelector('.btn-guest__label').textContent = loginLabel;
            }
        } catch (ex) {
            btn.removeAttribute('aria-busy');
            btn.querySelector('.btn-guest__label').textContent = loginLabel;
        }
    });

    mount.appendChild(btn);
}
