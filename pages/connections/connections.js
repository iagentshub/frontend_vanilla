// connections.js — inicialización y eventos de la página de conexiones
'use strict';

var _activeCategory = 'llm';


function _switchCategory(cat) {
    _activeCategory = cat;
    document.querySelectorAll('.conn-cat-tab').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    // Actualizar chips de filtro con sólo los providers de esta categoría
    FilterConnections.setTypes(Providers.list(cat), '#filter-connections-root');
    // Reconstruir el select de tipo sólo con los providers de esa categoría
    buildProviderSelect(cat);
    var firstType = Providers.first(cat);
    var typeEl = document.getElementById('conn-type');
    if (typeEl && firstType) {
        typeEl.value = firstType;
        buildDynamicFields(firstType, null);
    }
    // Aplicar filtro de lista
    setCategoryFilter(cat);
}

async function init() {
    renderNav('nav-root', 'connections');
    await window.requireAuth();

    await Providers.load();
    buildProviderSelect(_activeCategory);
    FilterConnections.init({
        mountEl: '#filter-connections-root',
        types: Providers.list(_activeCategory),
        onChange: _applyFilter,
    });
    await loadConnections();
    _initPanels();
    bindEvents();
}

function _initPanels() {
    var btnGroups   = document.getElementById('btn-toggle-groups');
    var groupsPanel = document.getElementById('conn-groups-panel');
    var _groupsVisible = false;

    if (groupsPanel && window.GroupPanel) {
        var groupCtrl = GroupPanel('connection', function (groupId) {
            window._connGroupMode = !!groupId;
            if (groupId) {
                loadConnections(groupId);
            } else {
                window._connGroupMode = false;
                loadConnections();
            }
        });
        groupCtrl.mount(groupsPanel);
        groupCtrl.load();
        window._groupPanelConn = groupCtrl;
    }

    if (btnGroups && groupsPanel) {
        btnGroups.addEventListener('click', function () {
            _groupsVisible = !_groupsVisible;
            groupsPanel.classList.toggle('folder-panel--collapsed', !_groupsVisible);
            btnGroups.classList.toggle('folder-toggle-btn--on', _groupsVisible);
            btnGroups.title = _groupsVisible ? 'Ocultar grupos' : 'Grupos de trabajo';
        });
    }
}

function bindEvents() {
    // Pestañas de categoría
    document.getElementById('conn-category-tabs').addEventListener('click', function (e) {
        var tab = e.target.closest('.conn-cat-tab');
        if (tab) _switchCategory(tab.dataset.cat);
    });

    document.getElementById('btn-new-conn').addEventListener('click', function () {
        openModal(null, _wsCtx, _activeCategory);
    });
    document.getElementById('conn-modal-close').addEventListener('click', closeModal);
    document.getElementById('conn-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-test-all').addEventListener('click', function () {
        testConnections(getVisibleConnectionIds());
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
            if (window.GroupShareDialog) {
                GroupShareDialog.open('connection', id, btn.dataset.name || id, loadConnections);
            }
            return;
        } else if (action === 'test') {
            testConnections([id]);
        } else if (action === 'edit') {
            try {
                var c = await api.get('/api/connections/' + encodeURIComponent(id));
                openModal(c, _wsCtx, Providers.category(c.type));
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
