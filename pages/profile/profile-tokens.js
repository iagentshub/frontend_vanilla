// profile-tokens.js — tokens personales (PAT) para clientes no navegador.
//
// Contrato soft-nav: este script se RE-EJECUTA al navegar sin recarga, así que
// solo var/function a nivel superior (nunca let/const/class).
(function () {
    'use strict';

    var _tokens = [];

    // ── Helpers ────────────────────────────────────────────────────────────────

    function _esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function _fmtDate(iso) {
        if (!iso) return '—';
        return iso.slice(0, 10);
    }

    function _statusLabel(status) {
        return status === 'active' ? 'Activo' : status === 'revoked' ? 'Revocado' : 'Caducado';
    }

    // ── Load & render ──────────────────────────────────────────────────────────

    function load() {
        api.get('/api/auth/tokens')
            .then(function (rows) { _tokens = rows || []; _render(); })
            .catch(function () { _tokens = []; _render(); });
    }

    function _render() {
        var wrap = document.getElementById('pat-list-wrap');
        if (!wrap) return;

        if (!_tokens.length) {
            wrap.innerHTML = '<p class="profile-empty-msg">Todavía no has creado ningún token.</p>';
            return;
        }

        var rows = _tokens.map(function (t) {
            // El nombre lo escribe el usuario: escapar SIEMPRE antes de innerHTML.
            var action = t.status === 'active'
                ? '<button class="btn btn-ghost btn-sm action-item--danger" data-revoke="' + _esc(t.id) + '">Revocar</button>'
                : '';
            return '<tr>' +
                '<td>' + _esc(t.name) + '</td>' +
                '<td><code>' + _esc(t.prefix) + '…</code></td>' +
                '<td class="td-date">' + _fmtDate(t.created_at) + '</td>' +
                '<td class="td-date">' + _fmtDate(t.last_used_at) + '</td>' +
                '<td class="td-date">' + (t.expires_at ? _fmtDate(t.expires_at) : 'Nunca') + '</td>' +
                '<td><span class="badge badge--' + (t.status === 'active' ? 'std' : 'warn') + '">' + _statusLabel(t.status) + '</span></td>' +
                '<td class="td-actions">' + action + '</td>' +
                '</tr>';
        }).join('');

        wrap.innerHTML = '<table class="admin-table"><thead><tr>' +
            '<th>Nombre</th><th>Token</th><th>Creado</th><th>Último uso</th><th>Caduca</th><th>Estado</th><th></th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>';

        wrap.querySelectorAll('[data-revoke]').forEach(function (btn) {
            btn.addEventListener('click', function () { _revoke(btn.getAttribute('data-revoke')); });
        });
    }

    // ── Acciones ───────────────────────────────────────────────────────────────

    function _create() {
        var nameInput = document.getElementById('pat-name');
        var expirySelect = document.getElementById('pat-expiry');
        if (!nameInput || !expirySelect) return;

        var name = (nameInput.value || '').trim();
        if (!name) return;

        var expiry = expirySelect.value;
        api.post('/api/auth/tokens', {
            name: name,
            expires_in_days: expiry === 'never' ? null : parseInt(expiry, 10),
        }).then(function (created) {
            nameInput.value = '';
            _showSecret(created.token);
            load();
        }).catch(function (e) {
            if (window.toast) toast(e.message || 'No se pudo crear el token', 'error');
        });
    }

    // El token en claro solo existe aquí y hasta que se recargue la página:
    // el backend no lo devuelve nunca más.
    function _showSecret(token) {
        var box = document.getElementById('pat-new-box');
        var code = document.getElementById('pat-new-value');
        if (!box || !code) return;
        code.textContent = token;   // textContent, no innerHTML
        box.hidden = false;
    }

    function _revoke(id) {
        var token = _tokens.filter(function (t) { return t.id === id; })[0];
        var label = token ? token.name : id;
        if (!confirm('¿Revocar "' + label + '"? Dejará de funcionar de inmediato.')) return;

        api.del('/api/auth/tokens/' + encodeURIComponent(id))
            .then(load)
            .catch(function (e) {
                if (window.toast) toast(e.message || 'No se pudo revocar el token', 'error');
            });
    }

    // ── Init ───────────────────────────────────────────────────────────────────

    function init() {
        var section = document.getElementById('section-tokens');
        if (!section) return;

        var form = document.getElementById('pat-form');
        if (form) {
            form.addEventListener('submit', function (e) { e.preventDefault(); _create(); });
        }

        var copyBtn = document.getElementById('pat-copy');
        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                var code = document.getElementById('pat-new-value');
                if (!code) return;
                navigator.clipboard.writeText(code.textContent).then(function () {
                    copyBtn.textContent = 'Copiado';
                });
            });
        }

        var hideBtn = document.getElementById('pat-hide');
        if (hideBtn) {
            hideBtn.addEventListener('click', function () {
                var box = document.getElementById('pat-new-box');
                if (box) box.hidden = true;
                if (copyBtn) copyBtn.textContent = 'Copiar';
            });
        }

        var navBtn = document.getElementById('nav-tokens');
        if (navBtn) {
            navBtn.addEventListener('click', function () { load(); });
        }
    }

    document.addEventListener('DOMContentLoaded', init);
}());
