'use strict';

var _agentSort = { col: 'name', dir: 1 };

function _populateAgentOwnerSelect() {
    var sel = document.getElementById('filter-agent-owner');
    if (!sel) return;
    var current = sel.value;
    var owners = [];
    _allAgents.forEach(function (a) {
        if (a.scope !== 'private') return;
        var o = a.owner_email || a.owner_id;
        if (o && owners.indexOf(o) === -1) owners.push(o);
    });
    owners.sort();
    sel.innerHTML = '<option value="">Todos los propietarios</option>' +
        owners.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('');
    if (current) sel.value = current;
}

function applyAgentFilters() {
    _populateAgentOwnerSelect();
    var q = ((document.getElementById('agent-search') || {}).value || '').toLowerCase();
    var owner = ((document.getElementById('filter-agent-owner') || {}).value || '');

    var filtered = _allAgents.filter(function (a) {
        if (a.scope !== 'private') return false;
        if (q && !(a.name || '').toLowerCase().includes(q) && !(a.id || '').toLowerCase().includes(q)) return false;
        if (owner) {
            var ao = a.owner_email || a.owner_id || '';
            if (ao !== owner) return false;
        }
        return true;
    });
    _sortAndRenderAgents(filtered);
}

function _sortAndRenderAgents(agents) {
    var col = _agentSort.col;
    var dir = _agentSort.dir;
    var sorted = agents.slice().sort(function (a, b) {
        var av = (a[col] || '').toString().toLowerCase();
        var bv = (b[col] || '').toString().toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
    });
    renderAgents(sorted);
}

function _thA(label, col) {
    var arrow = _agentSort.col === col ? (_agentSort.dir === 1 ? ' ▲' : ' ▼') : '';
    return '<th class="sortable" data-sort="' + col + '">' + label + arrow + '</th>';
}

function renderAgents(agents) {
    var wrap = document.getElementById('agents-table-wrap');
    if (!wrap) return;
    if (!agents || !agents.length) {
        wrap.innerHTML = '<div class="admin-empty">No hay agentes que coincidan.</div>';
        return;
    }

    var rows = agents.map(function (a) {
        var date = a.created_at
            ? new Date(a.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
            : '—';
        var ownerDisplay = a.owner_email ? esc(a.owner_email) : (a.owner_id ? esc(a.owner_id) : '<span style="opacity:.4">—</span>');
        var connId = a.connection_id ? esc(a.connection_id) : '<span style="opacity:.4">—</span>';

        var actions =
            '<div class="admin-actions-menu">' +
            '<button class="btn-actions">⋮</button>' +
            '<div class="actions-dropdown" style="display:none">' +
            '<button class="action-item" data-action="edit" data-agent-id="' + esc(a.id) + '"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>Editar</button>' +
            '<button class="action-item action-item--danger" data-action="delete" data-agent-id="' + esc(a.id) + '" data-scope="private"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Eliminar</button>' +
            '</div>' +
            '</div>';

        return '<tr>' +
            '<td><span class="conn-name">' + esc(a.name || a.id) + '</span></td>' +
            '<td><span class="badge badge--type">' + esc(a.agent_type || '—') + '</span></td>' +
            '<td class="td-owner">' + ownerDisplay + '</td>' +
            '<td class="td-owner">' + connId + '</td>' +
            '<td class="td-date">' + date + '</td>' +
            '<td class="td-actions">' + actions + '</td>' +
            '</tr>';
    }).join('');

    wrap.innerHTML =
        '<table class="admin-table">' +
        '<thead><tr>' +
        _thA('Nombre', 'name') +
        _thA('Tipo', 'agent_type') +
        _thA('Propietario', 'owner_email') +
        '<th>Conexión</th>' +
        _thA('Creado', 'created_at') +
        '<th></th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '</table>';

    wrap.querySelector('thead').addEventListener('click', function (e) {
        var th = e.target.closest('.sortable');
        if (!th) return;
        var col = th.dataset.sort;
        _agentSort.dir = _agentSort.col === col ? _agentSort.dir * -1 : 1;
        _agentSort.col = col;
        applyAgentFilters();
    });

    wrap.addEventListener('click', function (e) {
        var allDropdowns = wrap.querySelectorAll('.actions-dropdown');
        var btn = e.target.closest('.btn-actions');
        if (btn) {
            var menu = btn.nextElementSibling;
            var isOpen = menu.style.display !== 'none';
            allDropdowns.forEach(function (d) { d.style.display = 'none'; });
            if (!isOpen) menu.style.display = '';
            e.stopPropagation();
            return;
        }
        if (!e.target.closest('.admin-actions-menu')) {
            allDropdowns.forEach(function (d) { d.style.display = 'none'; });
        }
        var item = e.target.closest('.action-item');
        if (!item) return;
        allDropdowns.forEach(function (d) { d.style.display = 'none'; });
        if (item.dataset.action === 'delete') {
            _handleAgentDelete(item.dataset.agentId, item.dataset.scope);
        } else if (item.dataset.action === 'edit') {
            _openAgentEditModal(item.dataset.agentId);
        }
    });
}

async function _handleAgentDelete(agentId, scope) {
    if (!confirm('¿Eliminar el agente "' + agentId + '"? Esta acción no se puede deshacer.')) return;
    try {
        await api.del('/api/admin/agents/' + encodeURIComponent(agentId) + '?scope=' + encodeURIComponent(scope || 'private'));
        if (typeof toast === 'function') toast('Agente eliminado', 'success');
        await reloadData();
    } catch (err) {
        if (typeof toast === 'function') toast(err.message || 'Error al eliminar el agente', 'error');
    }
}

async function _openAgentEditModal(agentId) {
    var modal = document.getElementById('modal-edit-agent');
    document.getElementById('edit-agent-name').value    = '';
    document.getElementById('edit-agent-type').value    = 'generic';
    document.getElementById('edit-agent-model').value   = '';
    document.getElementById('edit-agent-conn').value    = '';
    document.getElementById('edit-agent-temp').value    = '0.7';
    document.getElementById('edit-agent-prompt').value  = '';
    modal._agentId = agentId;
    modal.style.display = '';
    try {
        var a = await api.get('/api/agents/' + encodeURIComponent(agentId));
        document.getElementById('edit-agent-name').value    = a.name    || '';
        document.getElementById('edit-agent-type').value    = a.agent_type || 'generic';
        document.getElementById('edit-agent-model').value   = a.model   || '';
        document.getElementById('edit-agent-conn').value    = a.connection_id || '';
        document.getElementById('edit-agent-temp').value    = (a.temperature !== undefined ? a.temperature : 0.7);
        document.getElementById('edit-agent-prompt').value  = a.system_prompt || '';
    } catch (err) {
        toast(err.message || 'Error al cargar el agente', 'error');
        modal.style.display = 'none';
    }
}

(function _bindAgentEditModal() {
    var modal     = document.getElementById('modal-edit-agent');
    var btnClose  = document.getElementById('btn-edit-agent-close');
    var btnCancel = document.getElementById('btn-edit-agent-cancel');
    var btnSave   = document.getElementById('btn-edit-agent-save');

    function _close() { modal.style.display = 'none'; }
    btnClose.addEventListener('click', _close);
    btnCancel.addEventListener('click', _close);
    modal.addEventListener('click', function (e) { if (e.target === modal) _close(); });

    btnSave.addEventListener('click', async function () {
        var agentId = modal._agentId;
        var payload = {
            name:          document.getElementById('edit-agent-name').value.trim(),
            agent_type:    document.getElementById('edit-agent-type').value,
            model:         document.getElementById('edit-agent-model').value.trim(),
            connection_id: document.getElementById('edit-agent-conn').value.trim() || null,
            temperature:   parseFloat(document.getElementById('edit-agent-temp').value) || 0.7,
            system_prompt: document.getElementById('edit-agent-prompt').value,
        };
        if (!payload.name) { toast('El nombre es obligatorio', 'error'); return; }
        try {
            await api.put('/api/admin/agents/' + encodeURIComponent(agentId), payload);
            toast('Agente actualizado', 'success');
            _close();
            await reloadData();
        } catch (err) {
            toast(err.message || 'Error al guardar', 'error');
        }
    });
}());
