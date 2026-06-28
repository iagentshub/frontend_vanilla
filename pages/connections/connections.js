// connections.js — inicialización y eventos de la página de conexiones
'use strict';

async function init() {
    await window.requireAuth();
    renderNav('nav-root', 'connections');

    // Workspace context — needed for scope selector and subtitle
    try {
        var me = await api.get('/api/auth/me');
        var wsCtx = {
            personal: me.workspace_personal !== false,
            id: me.workspace_id || me.username,
            name: me.workspace_name || (me.workspace_personal !== false ? 'Personal' : me.workspace_id),
        };
        setWsCtx(wsCtx);
        if (!wsCtx.personal) {
            var subtitle = document.querySelector('.page-subtitle');
            if (subtitle) subtitle.textContent = wsCtx.name;
        }
    } catch (_) {}

    await Providers.load();
    buildProviderSelect();
    FilterConnections.init({
        mountEl: '#filter-connections-root',
        types: Providers.list(),
        onChange: _applyFilter,
    });
    await loadConnections();
    bindEvents();
}

function bindEvents() {
    document.getElementById('btn-new-conn').addEventListener('click', function () { openModal(null, _wsCtx); });
    document.getElementById('conn-modal-close').addEventListener('click', closeModal);
    document.getElementById('conn-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-test-all').addEventListener('click', function () {
        testConnections(_connections.map(function (c) { return c.id; }));
    });

    document.getElementById('conn-type').addEventListener('change', function (e) {
        buildDynamicFields(e.target.value, null);
    });

    document.getElementById('connections-root').addEventListener('click', async function (e) {
        var groupBtn = e.target.closest('[data-group-test]');
        if (groupBtn) {
            var type = groupBtn.dataset.groupTest;
            var ids = _connections.filter(function (c) { return c.type === type; }).map(function (c) { return c.id; });
            testConnections(ids);
            return;
        }

        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.dataset.action;
        var id = btn.dataset.id;

        if (action === 'share') {
            if (window.shareTeams) shareTeams.open('connection', id, btn.dataset.name || id);
            return;
        } else if (action === 'test') {
            testConnections([id]);
        } else if (action === 'edit') {
            try {
                var c = await api.get('/api/connections/' + encodeURIComponent(id));
                openModal(c, _wsCtx);
            } catch (e) { toast(e.message, 'error'); }
        } else if (action === 'delete') {
            if (!confirm(t('connections.confirm_delete'))) return;
            try {
                await api.del('/api/connections/' + encodeURIComponent(id));
                toast(t('connections.deleted'), 'info');
                await loadConnections();
            } catch (e) { toast(e.message, 'error'); }
        }
    });

    if (window.i18n) {
        window.i18n.onLangChange(async function () { await loadConnections(); });
    }

    document.getElementById('conn-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        var type = document.getElementById('conn-type').value;
        var payload = {
            id: document.getElementById('conn-id').value || undefined,
            name: document.getElementById('conn-name').value.trim(),
            type: type,
            scope: getModalScope(),
            labels: getConnLabels(),
        };
        Object.assign(payload, collectDynamicFields());
        try {
            await api.post('/api/connections', payload);
            toast(t('connections.saved'), 'success');
            closeModal();
            await loadConnections();
        } catch (err) { toast(err.message, 'error'); }
    });

}

init();
