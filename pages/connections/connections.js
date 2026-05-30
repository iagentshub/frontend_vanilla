// connections.js — inicialización y eventos de la página de conexiones
'use strict';

async function init() {
    await window.requireAuth();
    renderNav('nav-root', 'connections');
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
    document.getElementById('btn-new-conn').addEventListener('click', function () { openModal(null); });
    document.getElementById('conn-modal-close').addEventListener('click', closeModal);
    document.getElementById('conn-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-test-all').addEventListener('click', function () {
        testConnections(_connections.map(function (c) { return c.id; }));
    });

    document.getElementById('conn-type').addEventListener('change', function (e) {
        toggleTypeFields(e.target.value);
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
                openModal(c);
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
            model: document.getElementById('conn-model').value.trim() || undefined,
        };
        var fields = Providers.fields(type);
        fields.forEach(function (f) {
            if (f.key === 'model') return;   // ya recogido arriba
            var el = document.getElementById('conn-' + f.key.replace('_', '-'));
            if (!el) return;
            var val = el.value.trim();
            if (val) payload[f.key] = val;
        });
        try {
            await api.post('/api/connections', payload);
            toast(t('connections.saved'), 'success');
            closeModal();
            await loadConnections();
        } catch (err) { toast(err.message, 'error'); }
    });

}

init();
