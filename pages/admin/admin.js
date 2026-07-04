'use strict';

var _activeTab = 'general';
var _lastRefresh = 0;
var _refreshTimer = null;
var _countTimer = null;
var _connections = [];
var _allAgents = [];
var _allKnowledge = [];
var _allTeams = [];
var _allWorkspaces = [];

async function reloadData() {
    var promises = [
        api.get('/api/admin/stats')
            .then(function (d) { renderStats(d); }),
        api.get('/api/admin/users')
            .then(function (d) { _allUsers = d; applyUserFilters(); }),
        api.get('/api/admin/workspaces')
            .then(function (d) { _allWorkspaces = d; applyWorkspaceFilters(); }),
        api.get('/api/admin/agents')
            .then(function (d) { _allAgents = d; applyAgentFilters(); }),
        api.get('/api/admin/connections')
            .then(function (d) { _connections = d; applyConnFilters(); }),
        api.get('/api/admin/knowledge')
            .then(function (d) { _allKnowledge = d; applyKnowledgeFilters(); }),
        api.get('/api/admin/groups')
            .then(function (d) { _allTeams = d; applyTeamFilters(); }),
    ];
    try {
        await Promise.all(promises);
        _lastRefresh = Date.now();
        _updateRefreshLabel();
    } catch (e) {
        if (e && e.status === 403) window.location.replace('/dashboard/');
    }
}

function _updateRefreshLabel() {
    var label = document.getElementById('refresh-label');
    if (!label) return;
    if (!_lastRefresh) { label.textContent = ''; return; }
    var secs = Math.round((Date.now() - _lastRefresh) / 1000);
    label.textContent = 'Actualizado hace ' + secs + 's';
}

function _startPolling() {
    _countTimer = setInterval(_updateRefreshLabel, 1000);
    _refreshTimer = setInterval(reloadData, 30000);
}

var _TAB_IDS = ['general', 'users', 'workspaces', 'teams', 'agents', 'connections', 'knowledge', 'config'];

function _bindTabs() {
    document.querySelectorAll('.admin-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
            _activeTab = btn.dataset.tab;
            document.querySelectorAll('.admin-tab').forEach(function (b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            _TAB_IDS.forEach(function (id) {
                var panel = document.getElementById('tab-' + id);
                if (panel) panel.style.display = (id === _activeTab) ? '' : 'none';
            });
            if (_activeTab === 'config' && window.adminConfig) adminConfig.init();
        });
    });
}

function _bindFilters() {
    ['user-search', 'filter-role', 'filter-active', 'filter-verified'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', applyUserFilters);
    });
    var wsSearchEl = document.getElementById('ws-search');
    if (wsSearchEl) wsSearchEl.addEventListener('input', applyWorkspaceFilters);
    var teamSearchEl = document.getElementById('team-search');
    if (teamSearchEl) teamSearchEl.addEventListener('input', applyTeamFilters);
    ['agent-search'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', applyAgentFilters);
    });
    var agentOwnerSel = document.getElementById('filter-agent-owner');
    if (agentOwnerSel) agentOwnerSel.addEventListener('change', applyAgentFilters);
    ['knowledge-search', 'filter-knowledge-type', 'filter-know-owner'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', applyKnowledgeFilters);
    });
    var connOwnerSel = document.getElementById('filter-conn-owner');
    if (connOwnerSel) connOwnerSel.addEventListener('change', applyConnFilters);
    var btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) btnRefresh.addEventListener('click', reloadData);
}

async function init() {
    var dataPromise = reloadData();
    await window.requireAuth();
    renderNav('nav-root', 'admin-users');
    _bindTabs();
    _bindFilters();
    await dataPromise;
    _startPolling();
}

init();
