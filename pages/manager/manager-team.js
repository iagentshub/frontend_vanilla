'use strict';

var _managerTeamId = null;
var _allMembers = [];
var _managerResources = { agents: [], connections: [], knowledge: [] };
var _editingMember = null;
var _editingPerms = {};

function renderMembers(members) {
    var wrap = document.getElementById('members-table-wrap');
    if (!wrap) return;
    if (!members.length) {
        wrap.innerHTML = '<div class="admin-empty">' + t('manager.manager.members.no_members') + '</div>';
        return;
    }

    var rows = members.map(function (m) {
        var isManager = m.is_manager;
        var roleBadge = isManager
            ? '<span class="badge badge--ok">' + t('teams.teams.manager_badge') + '</span>'
            : '<span class="badge badge--std">' + t('teams.teams.member_badge') + '</span>';

        var date = m.joined_at
            ? new Date(m.joined_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
            : '—';

        var permsCount = 0;
        if (m.permissions && m.permissions.agents) {
            permsCount += Object.keys((m.permissions.agents.items || {})).length;
        }

        var actions =
            '<div class="admin-actions-menu">' +
            '<button class="btn-actions" data-member="' + esc(m.username) + '">⋮</button>' +
            '<div class="actions-dropdown" style="display:none">' +
            '<button class="action-item" data-action="edit-perms" data-member="' + esc(m.username) + '"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' + t('manager.manager.members.edit_perms') + '</button>' +
            (!isManager ? '<button class="action-item" data-action="make-manager" data-member="' + esc(m.username) + '"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2l1.8 3.6L14 6.5l-3 2.9.7 4.1L8 11.4l-3.7 2.1.7-4.1-3-2.9 4.2-.9z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>' + t('manager.manager.members.make_manager') + '</button>' : '') +
            '<button class="action-item action-item--danger" data-action="remove" data-member="' + esc(m.username) + '"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' + t('manager.manager.members.remove') + '</button>' +
            '</div></div>';

        return '<tr>' +
            '<td><div class="user-avatar-cell"><div class="user-avatar-sm">' + esc((m.email || m.username || '?').charAt(0).toUpperCase()) + '</div>' +
            '<span>' + esc(m.email || m.username) + '</span></div></td>' +
            '<td>' + roleBadge + '</td>' +
            '<td>' + date + '</td>' +
            '<td class="td-actions">' + actions + '</td>' +
            '</tr>';
    }).join('');

    wrap.innerHTML =
        '<table class="admin-table">' +
        '<thead><tr>' +
        '<th>' + t('manager.manager.members.table_email') + '</th>' +
        '<th>' + t('manager.manager.members.table_role') + '</th>' +
        '<th>' + t('manager.manager.members.table_joined') + '</th>' +
        '<th></th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '</table>';

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
        var action = item.dataset.action;
        var member = item.dataset.member;
        allDropdowns.forEach(function (d) { d.style.display = 'none'; });
        _handleMemberAction(action, member);
    });
}

async function _handleMemberAction(action, username) {
    if (!_managerTeamId) return;
    if (action === 'edit-perms') {
        var member = _allMembers.find(function (m) { return m.username === username; });
        if (member) _openPermsModal(member);
        return;
    }
    if (action === 'make-manager') {
        if (!confirm('¿Promover a ' + username + ' como gestor del equipo?')) return;
        try {
            await api.patch('/api/teams/' + _managerTeamId + '/members/' + encodeURIComponent(username), { is_manager: true });
            toast('Gestor actualizado', 'success');
            await _reloadMembers();
        } catch (err) { toast(err.message || 'Error', 'error'); }
        return;
    }
    if (action === 'remove') {
        var msg = t('manager.manager.members.confirm_remove').replace('{{username}}', username);
        if (!confirm(msg)) return;
        try {
            await api.del('/api/teams/' + _managerTeamId + '/members/' + encodeURIComponent(username));
            toast(t('manager.manager.members.remove') + ' ✓', 'success');
            await _reloadMembers();
        } catch (err) { toast(err.message || 'Error', 'error'); }
    }
}

async function _reloadMembers() {
    if (!_managerTeamId) return;
    _allMembers = await api.get('/api/teams/' + _managerTeamId + '/members');
    renderMembers(_allMembers);
}

// ── Permissions modal ──────────────────────────────────────────────────────────

function _openPermsModal(member) {
    _editingMember = member.username;
    _editingPerms = JSON.parse(JSON.stringify(member.permissions || {}));

    var title = t('manager.manager.permissions.title').replace('{{username}}', member.email || member.username);
    document.getElementById('perms-modal-title').textContent = title;

    _renderPermsTab('agents');
    _renderPermsTab('connections');
    _renderPermsTab('knowledge');

    // Switch to agents tab
    _switchPermsTab('agents');

    document.getElementById('modal-permissions').style.display = '';
}

function _switchPermsTab(tab) {
    ['agents', 'connections', 'knowledge'].forEach(function (t) {
        document.getElementById('perms-tab-' + (t === 'agents' ? 'agents' : t === 'connections' ? 'connections' : 'knowledge')).style.display = (t === tab) ? '' : 'none';
    });
    document.querySelectorAll('[data-perms-tab]').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.permsTab === tab);
    });
}

function _renderPermsTab(type) {
    var section = _editingPerms[type] || { default: 'deny', items: {} };
    var defaultAllow = section.default === 'allow';
    var typeKey = type === 'agents' ? 'agents' : type === 'connections' ? 'conns' : 'know';

    var defaultChk = document.getElementById('perms-' + typeKey + '-default');
    var defaultLbl = document.getElementById('perms-' + typeKey + '-default-label');
    var listEl = document.getElementById('perms-' + typeKey + '-list');

    if (defaultChk) {
        defaultChk.checked = defaultAllow;
        if (defaultLbl) defaultLbl.textContent = defaultAllow ? t('manager.manager.permissions.default_allow') : t('manager.manager.permissions.default_deny');
        defaultChk.onchange = function () {
            if (!_editingPerms[type]) _editingPerms[type] = { default: 'deny', items: {} };
            _editingPerms[type].default = defaultChk.checked ? 'allow' : 'deny';
            if (defaultLbl) defaultLbl.textContent = defaultChk.checked ? t('manager.manager.permissions.default_allow') : t('manager.manager.permissions.default_deny');
        };
    }

    var resources = _managerResources[type] || [];
    if (!resources.length) {
        if (listEl) listEl.innerHTML = '<p class="admin-empty">' + t('manager.manager.permissions.no_resources') + '</p>';
        return;
    }
    if (!listEl) return;

    var theadCols, buildRow;
    if (type === 'agents') {
        theadCols = '<th>' + t('manager.manager.permissions.col_resource') + '</th>' +
            '<th class="perms-col-toggle">' + t('manager.manager.permissions.can_use') + '</th>';
        buildRow = function (res) {
            var itemPerms = (section.items || {})[res.id] || {};
            var checked = itemPerms.use !== undefined ? itemPerms.use : defaultAllow;
            return '<tr data-res-name="' + esc((res.name || res.id).toLowerCase()) + '">' +
                '<td>' + esc(res.name || res.id) + '</td>' +
                '<td class="perms-col-toggle"><label class="toggle"><input type="checkbox" class="perm-chk" data-res="' + esc(res.id) + '" data-perm="use"' + (checked ? ' checked' : '') + '><span class="toggle-track"></span></label></td>' +
                '</tr>';
        };
    } else if (type === 'connections') {
        theadCols = '<th>' + t('manager.manager.permissions.col_resource') + '</th>' +
            '<th class="perms-col-toggle">' + t('manager.manager.permissions.can_direct') + '</th>' +
            '<th class="perms-col-toggle">' + t('manager.manager.permissions.via_agent') + '</th>';
        buildRow = function (res) {
            var itemPerms = (section.items || {})[res.id] || {};
            var checkedDirect = itemPerms.direct !== undefined ? itemPerms.direct : defaultAllow;
            var checkedVia = itemPerms.via_agent !== undefined ? itemPerms.via_agent : defaultAllow;
            return '<tr data-res-name="' + esc((res.name || res.id).toLowerCase()) + '">' +
                '<td>' + esc(res.name || res.id) + '</td>' +
                '<td class="perms-col-toggle"><label class="toggle"><input type="checkbox" class="perm-chk" data-res="' + esc(res.id) + '" data-perm="direct"' + (checkedDirect ? ' checked' : '') + '><span class="toggle-track"></span></label></td>' +
                '<td class="perms-col-toggle"><label class="toggle"><input type="checkbox" class="perm-chk" data-res="' + esc(res.id) + '" data-perm="via_agent"' + (checkedVia ? ' checked' : '') + '><span class="toggle-track"></span></label></td>' +
                '</tr>';
        };
    } else {
        theadCols = '<th>' + t('manager.manager.permissions.col_resource') + '</th>' +
            '<th class="perms-col-toggle">' + t('manager.manager.permissions.can_view') + '</th>';
        buildRow = function (res) {
            var itemPerms = (section.items || {})[res.id] || {};
            var checkedView = itemPerms.view !== undefined ? itemPerms.view : defaultAllow;
            return '<tr data-res-name="' + esc((res.name || res.title || res.id).toLowerCase()) + '">' +
                '<td>' + esc(res.name || res.title || res.id) + '</td>' +
                '<td class="perms-col-toggle"><label class="toggle"><input type="checkbox" class="perm-chk" data-res="' + esc(res.id) + '" data-perm="view"' + (checkedView ? ' checked' : '') + '><span class="toggle-track"></span></label></td>' +
                '</tr>';
        };
    }

    var _pSearchSvg = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    listEl.innerHTML =
        '<div class="admin-search-wrap perms-filter-wrap"><span class="search-icon">' + _pSearchSvg + '</span><input class="admin-search perms-filter" placeholder="' + esc(t('manager.manager.permissions.filter_placeholder') || 'Filtrar…') + '" /></div>' +
        '<div class="perms-table-wrap">' +
        '<table class="admin-table perms-table"><thead><tr>' + theadCols + '</tr></thead>' +
        '<tbody>' + resources.map(buildRow).join('') + '</tbody>' +
        '</table></div>';

    listEl.querySelector('.perms-filter').addEventListener('input', function () {
        var q = this.value.toLowerCase();
        listEl.querySelectorAll('tbody tr').forEach(function (row) {
            row.style.display = !q || row.dataset.resName.includes(q) ? '' : 'none';
        });
    });

    listEl.querySelectorAll('.perm-chk').forEach(function (chk) {
        chk.addEventListener('change', function () {
            var resId = chk.dataset.res;
            var perm = chk.dataset.perm;
            if (!_editingPerms[type]) _editingPerms[type] = { default: 'deny', items: {} };
            if (!_editingPerms[type].items) _editingPerms[type].items = {};
            if (!_editingPerms[type].items[resId]) _editingPerms[type].items[resId] = {};
            _editingPerms[type].items[resId][perm] = chk.checked;
        });
    });
}

(function _bindPermsModal() {
    document.addEventListener('DOMContentLoaded', function () {
        var modal = document.getElementById('modal-permissions');
        var btnClose = document.getElementById('btn-perms-close');
        var btnCancel = document.getElementById('btn-perms-cancel');
        var btnSave = document.getElementById('btn-perms-save');

        function _close() { if (modal) modal.style.display = 'none'; }
        if (btnClose) btnClose.addEventListener('click', _close);
        if (btnCancel) btnCancel.addEventListener('click', _close);
        if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) _close(); });

        document.querySelectorAll('[data-perms-tab]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                _switchPermsTab(btn.dataset.permsTab);
            });
        });

        if (btnSave) {
            btnSave.addEventListener('click', async function () {
                if (!_managerTeamId || !_editingMember) return;
                try {
                    await api.patch('/api/teams/' + _managerTeamId + '/members/' + encodeURIComponent(_editingMember), { permissions: _editingPerms });
                    toast('Permisos guardados', 'success');
                    _close();
                    await _reloadMembers();
                } catch (err) { toast(err.message || 'Error al guardar', 'error'); }
            });
        }
    });
}());
