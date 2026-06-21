// profile-accounts.js — sección "Proveedores": credenciales (1 por cuenta)
'use strict';

var _profileConns = [];

// Solo las conexiones que son credenciales base (no auto-importadas por modelo)
function _credentials() {
    return _profileConns.filter(function (c) { return !c._imported; });
}

// ── Render ────────────────────────────────────────────────────────────────────

function _renderProviderGroups() {
    var root = document.getElementById('accounts-list');
    if (!root) return;

    var providerList = Providers.list();
    var creds = _credentials();

    // Agrupar credenciales por tipo
    var groups = {};
    providerList.forEach(function (p) { groups[p.id] = []; });
    creds.forEach(function (c) {
        var type = c.type || '';
        if (!groups[type]) groups[type] = [];
        groups[type].push(c);
    });

    root.innerHTML = providerList.map(function (p) {
        var items = groups[p.id] || [];
        var connsHtml = items.length
            ? items.map(_renderCredRow).join('')
            : '<div class="provider-empty">' + t('connections.page.new_btn') + ' para conectar</div>';

        return '<div class="provider-group">' +
            '<div class="provider-group-header">' +
            '<span class="provider-group-name">' + esc(p.label) + '</span>' +
            (items.length ? '<span class="provider-group-count">' + items.length + '</span>' : '') +
            '<button class="btn btn-ghost btn-sm provider-add-btn" data-type="' + esc(p.id) + '">' +
            '<svg width="11" height="11" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
            ' ' + t('connections.page.new_btn') + '</button>' +
            '</div>' +
            '<div class="provider-conns">' + connsHtml + '</div>' +
            '</div>';
    }).join('');

    _bindGroupActions(root);
}

function _renderCredRow(c) {
    var sub = c.model || c.host || c.url || '';
    var isHub = c.type === 'iagentshub';
    var canImportModels = !isHub && (c.type === 'ollama' || c.type === 'openai' ||
                    c.type === 'claude' || c.type === 'gemini' ||
                    c.type === 'nvidia' || c.type === 'qwen' || c.type === 'grok');
    return '<div class="provider-conn-row">' +
        '<div class="provider-conn-info">' +
        '<span class="provider-conn-name">' + esc(c.name) + '</span>' +
        (sub ? '<span class="provider-conn-sub">' + esc(sub) + '</span>' : '') +
        '</div>' +
        '<div class="provider-conn-actions">' +
        (isHub
            ? '<button class="btn btn-ghost btn-sm" data-pa="hub-sync" data-id="' + esc(c.id) + '">' +
              t('profile.accounts.hub_sync_btn', 'Sincronizar') + '</button>'
            : '') +
        (canImportModels
            ? '<button class="btn btn-ghost btn-sm" data-pa="import" data-id="' + esc(c.id) + '">' +
              t('profile.accounts.sync_btn') + '</button>'
            : '') +
        '<button class="btn btn-ghost btn-sm" data-pa="test" data-id="' + esc(c.id) + '">' + t('connections.actions.test') + '</button>' +
        '<button class="btn btn-ghost btn-sm" data-pa="edit" data-id="' + esc(c.id) + '">' + t('connections.actions.edit') + '</button>' +
        '<button class="btn btn-ghost btn-sm provider-btn-delete" data-pa="delete" data-id="' + esc(c.id) + '">' + t('connections.actions.delete') + '</button>' +
        '</div>' +
        '</div>';
}

function _bindGroupActions(root) {
    root.querySelectorAll('.provider-add-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            openModal({ type: btn.dataset.type });
        });
    });

    root.querySelectorAll('[data-pa]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            var action = btn.dataset.pa;
            var id = btn.dataset.id;

            if (action === 'edit') {
                try {
                    var c = await api.get('/api/connections/' + encodeURIComponent(id));
                    openModal(c);
                } catch (e) { toast(e.message, 'error'); }

            } else if (action === 'delete') {
                if (!confirm(t('connections.confirm_delete'))) return;
                try {
                    await api.del('/api/connections/' + encodeURIComponent(id));
                    toast(t('connections.deleted'), 'info');
                    await loadAccounts();
                } catch (e) { toast(e.message, 'error'); }

            } else if (action === 'test') {
                var orig = btn.textContent;
                btn.disabled = true;
                btn.textContent = t('connections.testing');
                try {
                    var results = await api.post('/api/connections/test-all', { ids: [id] });
                    var r = results[0];
                    toast(r.ok
                        ? '✓ ' + (r.message || 'OK')
                        : '✗ ' + (r.message || t('connections.test_error')),
                        r.ok ? 'success' : 'error');
                } catch (e) { toast(e.message, 'error'); }
                finally { btn.disabled = false; btn.textContent = orig; }

            } else if (action === 'import') {
                _importModels(id, btn);

            } else if (action === 'hub-sync') {
                _hubSync(id, btn);
            }
        });
    });
}

// ── Import: descubre modelos y crea conexiones ────────────────────────────────

async function _importModels(connId, btn) {
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = t('profile.accounts.syncing');
    try {
        var result = await api.post('/api/connections/' + encodeURIComponent(connId) + '/import-models', {});
        var n = result.created || 0;
        var u = result.updated || 0;
        toast('✓ ' + n + ' conexiones creadas, ' + u + ' actualizadas', 'success');
    } catch (e) {
        toast(e.message || t('profile.accounts.error_sync'), 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = orig;
    }
}

// ── Hub sync: trae agentes, skills, conocimiento y conexiones ─────────────────

async function _hubSync(connId, btn) {
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = t('profile.accounts.syncing');
    try {
        var r = await api.post('/api/connections/' + encodeURIComponent(connId) + '/hub-sync', {});
        var parts = [];
        if (r.agents)      parts.push(r.agents      + ' agentes');
        if (r.skills)      parts.push(r.skills      + ' skills');
        if (r.knowledge)   parts.push(r.knowledge   + ' conocimiento');
        if (r.connections) parts.push(r.connections + ' conexiones');
        if (r.updated)     parts.push(r.updated     + ' actualizados');
        var msg = parts.length ? parts.join(', ') : 'Sin cambios';
        if (r.errors && r.errors.length) {
            toast(msg + ' (con errores: ' + r.errors.join('; ') + ')', 'warning');
        } else {
            toast('Sincronizado: ' + msg, 'success');
        }
    } catch (e) {
        toast(e.message || 'Error en la sincronización', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = orig;
    }
}

// ── Load ──────────────────────────────────────────────────────────────────────

async function loadAccounts() {
    try {
        _profileConns = await api.get('/api/connections');
        _renderProviderGroups();
    } catch (e) {
        var root = document.getElementById('accounts-list');
        if (root) root.innerHTML = '<div class="provider-empty">Error cargando conexiones</div>';
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────

(async function _initProfileAccounts() {
    await Providers.load();
    buildProviderSelect();

    var closeBtn = document.getElementById('conn-modal-close');
    var cancelBtn = document.getElementById('conn-cancel');
    var typeSelect = document.getElementById('conn-type');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (typeSelect) {
        typeSelect.addEventListener('change', function (e) {
            buildDynamicFields(e.target.value, null);
        });
    }

    var form = document.getElementById('conn-form');
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var type = document.getElementById('conn-type').value;
            var payload = {
                id: document.getElementById('conn-id').value || undefined,
                name: document.getElementById('conn-name').value.trim(),
                type: type,
            };
            Object.assign(payload, collectDynamicFields());
            try {
                await api.post('/api/connections', payload);
                toast(t('connections.saved'), 'success');
                closeModal();
                await loadAccounts();
            } catch (err) { toast(err.message, 'error'); }
        });
    }

    if (window.i18n) {
        window.i18n.ready(loadAccounts);
    } else {
        await loadAccounts();
    }
}());
