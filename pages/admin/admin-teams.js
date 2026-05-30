'use strict';

var _teamSort = { col: 'created_at', dir: -1 };

var _TEAM_PALETTE = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#db2777'];
function _teamColor(name) {
    var c = 0;
    for (var i = 0; i < name.length; i++) c += name.charCodeAt(i);
    return _TEAM_PALETTE[c % _TEAM_PALETTE.length];
}

var _RESOURCE_ICONS = { agent: '🤖', skill: '🔧', connection: '🔌', knowledge: '📄' };
var _RESOURCE_LABELS = { agent: 'Agente', skill: 'Skill', connection: 'Conexión', knowledge: 'Conocimiento' };

function _thT(label, col) {
    var arrow = _teamSort.col === col ? (_teamSort.dir === 1 ? ' ▲' : ' ▼') : '';
    return '<th class="sortable" data-sort="' + col + '">' + label + arrow + '</th>';
}

function renderTeams(teams) {
    var wrap = document.getElementById('teams-table-wrap');
    if (!wrap) return;
    if (!teams.length) {
        wrap.innerHTML = '<div class="admin-empty">No hay grupos que coincidan con los filtros.</div>';
        return;
    }

    var rows = teams.map(function (t) {
        var letter = (t.name || '?').charAt(0).toUpperCase();
        var color = _teamColor(t.name || '');
        var date = t.created_at
            ? new Date(t.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
            : '—';

        var actions =
            '<div class="admin-actions-menu" data-team-id="' + esc(t.id) + '">' +
            '<button class="btn-actions" data-team-id="' + esc(t.id) + '">⋮</button>' +
            '<div class="actions-dropdown" style="display:none">' +
            '<button class="action-item" data-action="view" data-team-id="' + esc(t.id) + '" data-team-name="' + esc(t.name) + '"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M8 7v4M8 5.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Ver detalle</button>' +
            '<button class="action-item action-item--danger" data-action="delete" data-team-id="' + esc(t.id) + '" data-team-name="' + esc(t.name) + '"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Eliminar</button>' +
            '</div>' +
            '</div>';

        return '<tr>' +
            '<td><div class="user-avatar-cell">' +
            '<div class="user-avatar-sm" style="background:' + color + ';border-radius:8px;flex-shrink:0">' + esc(letter) + '</div>' +
            '<span>' + esc(t.name) + '</span>' +
            '</div></td>' +
            '<td class="td-email">' + esc(t.created_by || '—') + '</td>' +
            '<td><span class="badge badge--std">' + (t.member_count || 0) + ' miembro' + (t.member_count === 1 ? '' : 's') + '</span></td>' +
            '<td>' + (t.resource_count > 0
                ? '<span class="badge badge--ok">' + t.resource_count + ' recurso' + (t.resource_count === 1 ? '' : 's') + '</span>'
                : '<span style="color:var(--ink-3);font-size:12px">—</span>') + '</td>' +
            '<td class="td-date">' + date + '</td>' +
            '<td class="td-actions">' + actions + '</td>' +
            '</tr>';
    }).join('');

    wrap.innerHTML =
        '<table class="admin-table">' +
        '<thead><tr>' +
        _thT('Nombre', 'name') +
        _thT('Creado por', 'created_by') +
        '<th>Miembros</th>' +
        '<th>Recursos</th>' +
        _thT('Creado', 'created_at') +
        '<th></th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '</table>';

    wrap.querySelector('thead').addEventListener('click', function (e) {
        var th = e.target.closest('.sortable');
        if (!th) return;
        var col = th.dataset.sort;
        _teamSort.dir = _teamSort.col === col ? _teamSort.dir * -1 : 1;
        _teamSort.col = col;
        applyTeamFilters();
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
        _handleTeamAction(item.dataset.action, item.dataset.teamId, item.dataset.teamName);
    });
}

async function _reloadTeams() {
    _allTeams = await api.get('/api/admin/teams');
    applyTeamFilters();
}

async function _handleTeamAction(action, teamId, teamName) {
    if (action === 'view') {
        _openTeamDetail(teamId, teamName);
        return;
    }
    if (action === 'delete') {
        if (!confirm('¿Eliminar el grupo «' + teamName + '» y todos sus miembros y recursos compartidos?')) return;
        try {
            await api.del('/api/admin/teams/' + encodeURIComponent(teamId));
            toast('Grupo eliminado', 'success');
            await _reloadTeams();
        } catch (err) {
            toast(err.message || 'Error al eliminar el grupo', 'error');
        }
    }
}

function applyTeamFilters() {
    var q = (document.getElementById('team-search') ? document.getElementById('team-search').value : '').toLowerCase();

    var filtered = _allTeams.filter(function (t) {
        if (q && !(t.name || '').toLowerCase().includes(q) && !(t.created_by || '').toLowerCase().includes(q)) return false;
        return true;
    });

    var col = _teamSort.col;
    var dir = _teamSort.dir;
    filtered = filtered.slice().sort(function (a, b) {
        var av = (a[col] || '').toString().toLowerCase();
        var bv = (b[col] || '').toString().toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
    });

    renderTeams(filtered);
}

// ── Detail modal ───────────────────────────────────────────────────────────────

async function _openTeamDetail(teamId, teamName) {
    var modal = document.getElementById('modal-team-detail');
    var title = document.getElementById('team-detail-title');
    var body = document.getElementById('team-detail-body');
    if (!modal) return;

    title.textContent = teamName || 'Grupo';
    body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--ink-3)">Cargando…</div>';
    modal.style.display = '';

    try {
        var data = await api.get('/api/admin/teams/' + encodeURIComponent(teamId));
        body.innerHTML = _renderTeamDetailBody(data);
    } catch (err) {
        body.innerHTML = '<div style="padding:20px;color:var(--danger)">Error al cargar: ' + esc(err.message || String(err)) + '</div>';
    }
}

function _renderTeamDetailBody(data) {
    var members = data.members || [];
    var resources = data.resources || [];
    var team = data.team || {};

    // Members section
    var membersHtml = members.length
        ? members.map(function (m) {
            var role = m.is_manager ? '<span class="badge badge--admin" style="font-size:10px">Gestor</span>' : '<span class="badge badge--std" style="font-size:10px">Miembro</span>';
            var joined = m.joined_at
                ? new Date(m.joined_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
                : '—';
            return '<tr>' +
                '<td><div class="user-avatar-cell" style="gap:8px">' +
                '<div class="user-avatar-sm" style="width:26px;height:26px;font-size:11px;flex-shrink:0">' +
                esc((m.username || '?').charAt(0).toUpperCase()) +
                '</div>' +
                '<span style="font-size:13px">' + esc(m.username) + '</span>' +
                '</div></td>' +
                '<td>' + role + '</td>' +
                '<td class="td-date">' + joined + '</td>' +
                '</tr>';
        }).join('')
        : '<tr><td colspan="3" style="color:var(--ink-3);font-size:13px;padding:12px">Sin miembros</td></tr>';

    // Resources section grouped by type
    var byType = {};
    resources.forEach(function (r) {
        if (!byType[r.resource_type]) byType[r.resource_type] = [];
        byType[r.resource_type].push(r);
    });
    var resourcesHtml = '';
    if (resources.length === 0) {
        resourcesHtml = '<tr><td colspan="3" style="color:var(--ink-3);font-size:13px;padding:12px">Sin contenido compartido</td></tr>';
    } else {
        ['agent', 'skill', 'connection', 'knowledge'].forEach(function (rtype) {
            var list = byType[rtype];
            if (!list || !list.length) return;
            list.forEach(function (r) {
                var icon = _RESOURCE_ICONS[rtype] || '📦';
                var label = _RESOURCE_LABELS[rtype] || rtype;
                var sharedAt = r.shared_at
                    ? new Date(r.shared_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
                    : '—';
                resourcesHtml +=
                    '<tr>' +
                    '<td><span style="font-size:13px">' + icon + ' ' + esc(r.name || r.resource_id) + '</span></td>' +
                    '<td><span class="badge badge--type" style="font-size:10px">' + esc(label) + '</span></td>' +
                    '<td class="td-date">' + sharedAt + '</td>' +
                    '</tr>';
            });
        });
    }

    return '<div style="padding:0 20px 4px">' +
        '<p style="font-size:12px;color:var(--ink-3);margin:12px 0 4px">Creado por <strong>' + esc(team.created_by || '—') + '</strong></p>' +
        '</div>' +
        '<div style="padding:0 20px 16px">' +
        '<div class="admin-detail-section-title">Miembros</div>' +
        '<table class="admin-table" style="margin-top:6px"><tbody>' + membersHtml + '</tbody></table>' +
        '</div>' +
        '<div style="padding:0 20px 20px">' +
        '<div class="admin-detail-section-title">Contenido compartido</div>' +
        '<table class="admin-table" style="margin-top:6px"><tbody>' + resourcesHtml + '</tbody></table>' +
        '</div>';
}

(function _bindTeamDetailModal() {
    var modal = document.getElementById('modal-team-detail');
    if (!modal) return;
    function _close() { modal.style.display = 'none'; }
    document.getElementById('btn-team-detail-close').addEventListener('click', _close);
    document.getElementById('btn-team-detail-cancel').addEventListener('click', _close);
    modal.addEventListener('click', function (e) { if (e.target === modal) _close(); });
}());
