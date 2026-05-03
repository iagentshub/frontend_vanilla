// agents.js — inicialización y acciones de la página de agentes
'use strict';

async function init() {
    await window.requireAuth();
    renderNav('nav-root', 'agents');
    await _loadAll();
    _initFilters();
    _initCatalog();
    if (window.i18n) {
        window.i18n.onLangChange(async function () {
            await _loadAll();
            _initFilters();
        });
    }
    _bindActions();
    _bindAgentModal();
    _bindExportModal();
}

function _initCatalog() {
    AgentCatalog.init({
        mountEl: document.getElementById('btn-catalog'),
        onFork: function (agent) {
            _openAgentModal({
                name: agent.name,
                description: agent.description,
                system_prompt: agent.system_prompt,
                temperature: agent.temperature,
                skills: agent.skills,
                use_memory: agent.use_memory,
                memory_file: agent.memory_file,
                connection_id: agent.connection_id,
            });
        },
    });
}

function _initFilters() {
    FilterAgents.init({
        mountEl: '#filter-agents-root',
        skills: _skills,
        connections: _connections,
        initialScope: 'private',
        onChange: function () { _applyFilter(); },
    });
}

function _bindActions() {

    document.getElementById('btn-new-agent').addEventListener('click', () => _openAgentModal());

    document.getElementById('agents-grid').addEventListener('click', async e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const { action, id } = btn.dataset;
        if (action === 'chat') {
            const a = _agents.find(x => x.id === id);
            if (a && typeof openChat === 'function') openChat(a);
        } else if (action === 'edit') {
            try {
                const full = await api.get(`/api/agents/${encodeURIComponent(id)}`);
                _openAgentModal(full);
            } catch (e) { toast(e.message, 'error'); }
        } else if (action === 'export') {
            _openExportModal(id);
        } else if (action === 'delete') {
            if (!confirm(t('agents.confirm_delete'))) return;
            try {
                await api.del(`/api/agents/${encodeURIComponent(id)}`);
                toast(t('agents.deleted'), 'info');
                await _loadAll();
            } catch (e) { toast(e.message, 'error'); }
        }
    });
}

init();
