'use strict';

var _connSort = { col: 'tokens_total', dir: -1 };

function _populateConnOwnerSelect() {
    var sel = document.getElementById('filter-conn-owner');
    if (!sel) return;
    var current = sel.value;
    var owners = [];
    _connections.forEach(function (c) {
        var o = c.owner_email || c.owner_id;
        if (o && owners.indexOf(o) === -1) owners.push(o);
    });
    owners.sort();
    sel.innerHTML = '<option value="">Todos los propietarios</option>' +
        owners.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('');
    if (current) sel.value = current;
}

function applyConnFilters() {
    _populateConnOwnerSelect();
    var owner = ((document.getElementById('filter-conn-owner') || {}).value || '');
    var filtered = _connections.filter(function (c) {
        if (owner) {
            var co = c.owner_email || c.owner_id || '';
            if (co !== owner) return false;
        }
        return true;
    });
    _sortAndRenderConnections(filtered);
}

function renderConnections(connections) {
    applyConnFilters();
}

function _sortAndRenderConnections(connections) {
    var col = _connSort.col;
    var dir = _connSort.dir;
    var sorted = connections.slice().sort(function (a, b) {
        if (col === 'tokens_total') {
            var at = (a.tokens_in || 0) + (a.tokens_out || 0);
            var bt = (b.tokens_in || 0) + (b.tokens_out || 0);
            return (at - bt) * dir;
        }
        var av = (a[col] || '').toString().toLowerCase();
        var bv = (b[col] || '').toString().toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
    });
    _renderConnectionsTable(sorted);
}

function _thC(label, col) {
    var arrow = _connSort.col === col ? (_connSort.dir === 1 ? ' ▲' : ' ▼') : '';
    return '<th class="sortable" data-sort="' + col + '">' + label + arrow + '</th>';
}

function _renderConnectionsTable(connections) {
    var wrap = document.getElementById('connections-table-wrap');
    if (!wrap) return;
    if (!connections || !connections.length) {
        wrap.innerHTML = '<div class="admin-empty">No hay conexiones registradas.</div>';
        return;
    }

    var rows = connections.map(function (c) {
        var tokTotal = (c.tokens_in || 0) + (c.tokens_out || 0);
        var date = c.created_at
            ? new Date(c.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
            : '—';
        var ownerDisplay = esc(c.owner_email || c.owner_id || '—');

        var actions =
            '<div class="admin-actions-menu">' +
            '<button class="btn-actions">⋮</button>' +
            '<div class="actions-dropdown" style="display:none">' +
            '<button class="action-item action-item--danger" data-action="delete" data-conn-id="' + esc(c.id) + '"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Eliminar</button>' +
            '</div>' +
            '</div>';

        return '<tr>' +
            '<td><span class="conn-name">' + esc(c.name || c.id) + '</span></td>' +
            '<td><span class="badge badge--type">' + esc(c.type || '—') + '</span></td>' +
            '<td class="td-owner">' + ownerDisplay + '</td>' +
            '<td class="td-tokens">' + fmtTokens(tokTotal) + '</td>' +
            '<td class="td-date">' + date + '</td>' +
            '<td class="td-actions">' + actions + '</td>' +
            '</tr>';
    }).join('');

    wrap.innerHTML =
        '<table class="admin-table">' +
        '<thead><tr>' +
        _thC('Nombre', 'name') +
        '<th>Tipo</th>' +
        _thC('Propietario', 'owner_email') +
        _thC('Tokens', 'tokens_total') +
        _thC('Creado', 'created_at') +
        '<th></th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '</table>';

    wrap.querySelector('thead').addEventListener('click', function (e) {
        var th = e.target.closest('.sortable');
        if (!th) return;
        var col = th.dataset.sort;
        _connSort.dir = _connSort.col === col ? _connSort.dir * -1 : 1;
        _connSort.col = col;
        _sortAndRenderConnections(_connections);
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
            _handleConnDelete(item.dataset.connId);
        }
    });
}

async function _handleConnDelete(connId) {
    if (!confirm('¿Eliminar esta conexión? Se perderá el historial de tokens asociado.')) return;
    try {
        await api.del('/api/admin/connections/' + encodeURIComponent(connId));
        if (typeof toast === 'function') toast('Conexión eliminada', 'success');
        await reloadData();
    } catch (err) {
        if (typeof toast === 'function') toast(err.message || 'Error al eliminar la conexión', 'error');
    }
}
