'use strict';

var _activeTab = 'team';

async function reloadData() {
    if (!_managerTeamId) return;
    try {
        _allMembers = await api.get('/api/teams/' + _managerTeamId + '/members');
        renderMembers(_allMembers);

        var invs = await api.get('/api/teams/' + _managerTeamId + '/invitations');
        renderInvitations(invs);

        // Load manager's resources for permission modal
        var agents = await api.get('/api/agents?scope=all');
        var conns = await api.get('/api/connections');
        var knowledge = await api.get('/api/knowledge');
        _managerResources.agents = agents.map(function (a) { return { id: a.id, name: a.name }; });
        _managerResources.connections = conns.map(function (c) { return { id: c.id, name: c.name || c.label || c.id }; });
        _managerResources.knowledge = knowledge.map(function (k) { return { id: k.id, title: k.title }; });
    } catch (e) {
        if (e && e.status === 403) window.location.replace('/dashboard/');
    }
}

function _bindTabs() {
    document.querySelectorAll('.admin-tab[data-tab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            _activeTab = btn.dataset.tab;
            document.querySelectorAll('.admin-tab[data-tab]').forEach(function (b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            ['team', 'invitations'].forEach(function (id) {
                var panel = document.getElementById('tab-' + id);
                if (panel) panel.style.display = (id === _activeTab) ? '' : 'none';
            });
        });
    });
}

async function init() {
    var dataPromise;
    await window.requireAuth();

    // Verify gestor role
    var me = await api.get('/api/auth/me');
    if (me.role !== 'gestor' && me.role !== 'admin') {
        window.location.replace('/dashboard/');
        return;
    }

    renderNav('nav-root', 'manager-team');

    // Get team ID from URL or load first managed team
    var params = new URLSearchParams(window.location.search);
    _managerTeamId = params.get('team');

    if (!_managerTeamId) {
        // Load first managed team
        var teams = await api.get('/api/teams/');
        var managed = teams.filter(function (t) { return t.is_manager; });
        if (!managed.length) {
            window.location.replace('/profile/?tab=teams');
            return;
        }
        _managerTeamId = managed[0].id;
    }

    // Show team name
    try {
        var team = await api.get('/api/teams/' + _managerTeamId);
        var nameEl = document.getElementById('manager-team-name');
        if (nameEl) nameEl.textContent = team.name || '';
    } catch (e) { }

    _bindTabs();
    await reloadData();
}

init();
