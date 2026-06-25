// agents-state.js — estado global y carga de datos
'use strict';

let _agents = [];
let _connections = [];
let _skills = [];
let _memories = [];
let _knowledge = [];
let _connStatus = {}; // { connId: true | false } — undefined = aún sin testar
let _activeFolderId = null; // null = todos
let _agentPage = 1;
let _filteredAgents = [];

async function _loadAll() {
    _connStatus = {};
    [_agents, _connections, _skills, _memories, _knowledge] = await Promise.all([
        api.get('/api/agents'),
        api.get('/api/connections'),
        api.get('/api/skills'),
        api.get('/api/memory').catch(() => []),
        api.get('/api/knowledge').catch(() => []),
    ]);
    FilterAgents.setData(_skills, _connections, _knowledge);
    AgentCatalog.setAgents(_agents.filter(a => (a.scope || 'private') === 'public'));
    _applyFilter();
    _syncConnectionSelect();
    _testUsedConnections();
    _loadKnowledgeItems();
}

async function _testUsedConnections() {
    const usedIds = [...new Set(_agents.map(a => a.connection_id).filter(Boolean))];
    if (!usedIds.length) return;
    try {
        const results = await api.post('/api/connections/test-all', { ids: usedIds });
        results.forEach(r => { _connStatus[r.id] = r.ok; });
        _renderAgentPage(); // refresca indicadores sin resetear la página
    } catch (_) { }
}

function _applyFilter() {
    const f = FilterAgents.getFilter();
    let list = _agents;

    if (f.query) {
        const q = f.query.toLowerCase();
        list = list.filter(a =>
            a.name.toLowerCase().includes(q) ||
            (a.description || '').toLowerCase().includes(q)
        );
    }
    if (f.skillIds.length) {
        list = list.filter(a =>
            f.skillIds.every(sid => (a.skills || []).includes(sid))
        );
    }
    if (f.connIds.length) {
        list = list.filter(a => f.connIds.includes(a.connection_id));
    }
    if (f.knowledgeIds.length) {
        list = list.filter(a =>
            f.knowledgeIds.every(kid => (a.knowledge || []).includes(kid))
        );
    }
    if (f.memory === true) list = list.filter(a => a.use_memory);
    if (f.memory === false) list = list.filter(a => !a.use_memory);
    if (f.scope) list = list.filter(a => (a.scope || 'private') === f.scope);
    else list = list.filter(a => (a.scope || 'private') === 'private');

    if (_activeFolderId !== null) {
        list = list.filter(a => (a.folder_id || null) === _activeFolderId);
    }

    _filteredAgents = list;
    _agentPage = 1;
    _renderAgentPage();

    if (window._folderAgents) {
        window._folderAgents.updateStats(_agents.filter(a => (a.scope || 'private') === 'private'));
    }
}

function _renderAgentPage() {
    const ps = getPageSize();
    const shown = _agentPage * ps;
    const grid = document.getElementById('agents-grid');
    AgentCard.renderGrid(_filteredAgents.slice(0, shown), _connections, _skills, grid, _connStatus);
    renderLoadMore(grid, _filteredAgents.length, shown, function () { _agentPage++; _renderAgentPage(); });
}

function _setActiveFolder(folderId) {
    _activeFolderId = folderId;
    _applyFilter();
}
