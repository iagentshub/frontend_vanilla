// admin-config.js — Tab de Configuración del panel de administración
'use strict';

window.adminConfig = (function () {
    var _cfg = {};

    function _set(id, val) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!val;
        else el.value = val;
    }

    async function load() {
        try {
            _cfg = await api.get('/api/settings/platform');
            _set('cfg-registration', _cfg.registration || 'open');
            _set('cfg-max-users', _cfg.max_users ?? 0);
            _set('cfg-max-sessions', _cfg.max_concurrent_sessions ?? 0);
            _set('cfg-email-verify', _cfg.email_verify ?? false);
            _set('cfg-guest-enabled', _cfg.guest_enabled ?? true);
            _set('cfg-billing', _cfg.billing_enabled ?? false);
            _set('cfg-log-retention', _cfg.log_retention_days ?? 30);
        } catch (e) {
            console.error('[admin-config] Error cargando configuración:', e);
        }
    }

    async function save(e) {
        e.preventDefault();
        var btn = document.getElementById('btn-save-config');
        var msg = document.getElementById('config-save-msg');
        btn.disabled = true;
        btn.textContent = 'Guardando…';
        if (msg) msg.textContent = '';
        try {
            var payload = {
                registration: document.getElementById('cfg-registration')?.value,
                max_users: parseInt(document.getElementById('cfg-max-users')?.value || '0', 10),
                max_concurrent_sessions: parseInt(document.getElementById('cfg-max-sessions')?.value || '0', 10),
                email_verify: document.getElementById('cfg-email-verify')?.checked,
                guest_enabled: document.getElementById('cfg-guest-enabled')?.checked,
                billing_enabled: document.getElementById('cfg-billing')?.checked,
                log_retention_days: parseInt(document.getElementById('cfg-log-retention')?.value || '30', 10),
            };
            _cfg = await api.put('/api/settings/platform', payload);
            if (msg) {
                msg.textContent = '✓ Configuración guardada';
                setTimeout(function () { msg.textContent = ''; }, 3000);
            }
            toast && toast('Configuración guardada', 'success');
        } catch (err) {
            toast && toast(err.message || 'Error al guardar', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Guardar configuración';
        }
    }

    function init() {
        load();
        var form = document.getElementById('config-form');
        if (form) form.addEventListener('submit', save);
    }

    return { init: init, load: load };
}());
