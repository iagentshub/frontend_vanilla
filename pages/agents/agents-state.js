// agents-state.js — estado global y carga de datos
'use strict';

var _agents = [];
var _connections = [];
var _skills = [];
var _memories = [];
var _knowledge = [];
var _connStatus = {}; // { connId: true | false } — undefined = aún sin testar
var _activeGroupId = null;  // null = sin filtro de grupo
var _groupAgents = [];      // agentes cargados al filtrar por grupo
var _agentPage = 1;
var _filteredAgents = [];

async function _loadAll() {
    _connStatus = {};
    const [me, agentsRes, connsRes, skillsRes, memoriesRes, knowledgeRes] = await Promise.all([
        api.get('/api/auth/me').catch(() => ({})),
        api.get('/api/agents'),
        api.get('/api/connections'),
        api.get('/api/skills'),
        api.get('/api/memory').catch(() => []),
        api.get('/api/knowledge').catch(() => []),
    ]);
    window.__ME__ = me.username || null;
    window.__WS_IS_TEAM__ = false; // workspace switching eliminado
    [_agents, _connections, _skills, _memories, _knowledge] = [agentsRes, connsRes, skillsRes, memoriesRes, knowledgeRes];
    // Refrescar agentes del grupo activo si hay uno seleccionado
    if (_activeGroupId) {
        try {
            _groupAgents = await api.get('/api/agents?group_id=' + encodeURIComponent(_activeGroupId));
        } catch (_) { _groupAgents = []; }
    }
    // Merge social visibility flags into agent objects
    try {
        const social = await api.get('/api/social/me/resources?type=agent');
        const map = {};
        (social.resources || []).forEach(function (r) { map[r.resource_id] = r; });
        _agents = _agents.map(function (a) {
            const s = map[a.id];
            return s ? Object.assign({}, a, { _social_public: !!s.is_public, _social_category: s.category, _social_stars: s.stars_count, _linked_broken: !!s.linked_broken, _linked_to_user: s.linked_to_user || null, _social_verified: !!(s.verified) }) : a;
        });
    } catch (err) { console.error('[agents-state] Error cargando datos sociales:', err); }

    // Cargar preferencias de conexión personal para agentes linked (workspace compartido)
    var linkedAgents = _agents.filter(function (a) { return a.origin_type === 'linked'; });
    if (linkedAgents.length) {
        var prefResults = await Promise.all(
            linkedAgents.map(function (a) {
                return api.get('/api/agents/' + encodeURIComponent(a.id) + '/preferences').catch(function () { return null; });
            })
        );
        prefResults.forEach(function (pref, i) {
            if (pref && pref.connection_id) {
                linkedAgents[i]._pref_conn_id = pref.connection_id;
            }
        });
    }

    FilterAgents.setData(_skills, _connections, _knowledge);
    AgentCatalog.setAgents(_agents.filter(a => (a.scope || 'private') === 'public' || a._shared));
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
    // Modo grupo: muestra solo los agentes del grupo seleccionado
    if (_activeGroupId) {
        _filteredAgents = _groupAgents;
        _agentPage = 1;
        _renderAgentPage();
        _updateDeleteBanner();
        return;
    }

    const f = FilterAgents.getFilter();
    // Incluir agentes propios y agentes linked del workspace (no los otros shared)
    let list = _agents.filter(a => !a._shared || a.origin_type === 'linked');

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
    // Los linked del workspace siempre son privados; se muestran junto a los agentes privados
    // Si hay filtro de scope: aplicarlo. Si no: mostrar todos (privados y públicos del usuario)
    if (f.scope) list = list.filter(a => (a.scope || 'private') === f.scope || a.origin_type === 'linked');

    if (f.labels && f.labels.length) {
        list = list.filter(a => f.labels.some(lbl => (a.labels || ['private']).indexOf(lbl) !== -1));
    }

    _filteredAgents = list;
    _agentPage = 1;
    _renderAgentPage();
    _updateDeleteBanner();
}

function _updateDeleteBanner() {
    var banner = document.getElementById('agents-delete-banner');
    var countEl = document.getElementById('agents-delete-count');
    var deleteBtn = document.getElementById('agents-delete-all-btn');
    if (!banner) return;
    var toDelete = _agents.filter(function (a) { return (a.labels || []).indexOf('delete') !== -1; });
    if (!toDelete.length) { banner.style.display = 'none'; return; }
    banner.style.display = 'flex';
    var n = toDelete.length;
    countEl.textContent = n + ' agente' + (n > 1 ? 's' : '') + ' marcado' + (n > 1 ? 's' : '') + ' para borrar';
    deleteBtn.textContent = 'Borrar ' + (n > 1 ? 'todos' : 'este');
    deleteBtn.onclick = async function () {
        if (!confirm('¿Seguro que quieres borrar ' + n + ' agente' + (n > 1 ? 's' : '') + ' marcado' + (n > 1 ? 's' : '') + ' para borrar?')) return;
        deleteBtn.disabled = true;
        var ok = 0;
        for (var i = 0; i < toDelete.length; i++) {
            try {
                await api.del('/api/agents/' + encodeURIComponent(toDelete[i].id));
                ok++;
            } catch (err) { console.error('[agents-state] Error al borrar agente:', err); }
        }
        if (window.toast) toast('Borrado' + (ok > 1 ? 's ' + ok + ' agentes' : ' 1 agente'), 'success');
        await _loadAll();
    };
    document.getElementById('agents-delete-dismiss-btn').onclick = function () {
        banner.style.display = 'none';
    };
}

function _renderAgentPage() {
    const ps = getPageSize();
    const shown = _agentPage * ps;
    const grid = document.getElementById('agents-grid');
    AgentCard.renderGrid(_filteredAgents.slice(0, shown), _connections, _skills, grid, _connStatus);
    renderLoadMore(grid, _filteredAgents.length, shown, function () { _agentPage++; _renderAgentPage(); });
}

async function _setActiveGroup(groupId) {
    _activeGroupId = groupId;
    // Limpiar inmediatamente para evitar race condition con _testUsedConnections:
    // si _renderAgentPage() se llama entre el await y el final de esta función,
    // mostraría datos del grupo anterior en vez del vacío correcto.
    _groupAgents = [];
    _applyFilter(); // mostrar vacío de inmediato
    if (groupId) {
        try {
            _groupAgents = await api.get('/api/agents?group_id=' + encodeURIComponent(groupId));
        } catch (_) { _groupAgents = []; }
        _applyFilter(); // actualizar con los datos cargados
    }
}
