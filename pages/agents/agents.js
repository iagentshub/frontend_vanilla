// agents.js — inicialización y acciones de la página de agentes
'use strict';

async function init() {
    await window.requireAuth();
    renderNav('nav-root', 'agents');
    _initFolders();
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
    _bindLoadPreviewModal();
    _bindBlueprintModal();
    _setupDragHandlers();
}

function _initFolders() {
    var panelEl = document.getElementById('af-folder-panel');
    if (!panelEl) return;
    var folderCtrl = KnowledgeFolders('agents', function (folderId) {
        _setActiveFolder(folderId);
    });
    folderCtrl.mount(panelEl);
    folderCtrl.load();
    window._folderAgents = folderCtrl;
}

function _setupDragHandlers() {
    var grid = document.getElementById('agents-grid');
    if (!grid) return;
    grid.addEventListener('dragstart', function (e) {
        var card = e.target.closest('[data-drag-id]');
        if (!card) return;
        window._kDrag = { id: card.dataset.dragId, section: card.dataset.dragSection };
        card.classList.add('kd-dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    grid.addEventListener('dragend', function (e) {
        var card = e.target.closest('[data-drag-id]');
        if (card) card.classList.remove('kd-dragging');
        window._kDrag = null;
    });
}

function _initCatalog() {
    AgentCatalog.init({
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
        knowledge: _knowledge,
        initialScope: 'private',
        onChange: function () { _applyFilter(); },
    });
}

var _SVG_GRID = '<svg width="15" height="15" viewBox="0 0 15 15" fill="none">'
    + '<rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/>'
    + '<rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/>'
    + '<rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/>'
    + '<rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/>'
    + '</svg>';
var _SVG_UPLOAD = '<svg width="15" height="15" viewBox="0 0 13 13" fill="none">'
    + '<path d="M6.5 8.5V1M3 4L6.5 1 10 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M1 10.5v1a.5.5 0 00.5.5h10a.5.5 0 00.5-.5v-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    + '</svg>';
var _SVG_PLUS = '<svg width="15" height="15" viewBox="0 0 13 13" fill="none">'
    + '<path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    + '</svg>';

function _bindActions() {

    document.getElementById('btn-new-agent').addEventListener('click', function () {
        ActionMenu.show(this, [
            { icon: _SVG_GRID,   label: t('agents.page.new_from_catalog'),  sub: t('agents.page.new_from_catalog_sub'),  steps: 1, onClick: function () { AgentCatalog.open(); } },
            { icon: _SVG_UPLOAD, label: t('agents.page.new_from_file'),     sub: t('agents.page.new_from_file_sub'),     steps: 2, onClick: function () { document.getElementById('agent-file-input').click(); } },
            { icon: _SVG_PLUS,   label: t('agents.page.new_from_scratch'),  sub: t('agents.page.new_from_scratch_sub'),  steps: 1, onClick: function () { _openAgentModal(); } },
        ]);
    });

    document.getElementById('agent-file-input').addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var agent = _parseAndLoadAgent(file.name, ev.target.result);
                _openLoadPreview(agent, agent._source || 'generic_json');
            } catch (err) {
                toast(t('agents.page.load_error', { msg: err.message }), 'error');
            }
        };
        reader.readAsText(file);
    });

    // Drag-and-drop import (bypasses OS hidden-file filtering)
    var _dropOverlay = document.getElementById('agent-drop-overlay');
    var _dragCounter = 0;

    function _hasFiles(e) {
        return e.dataTransfer && e.dataTransfer.types &&
            Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') !== -1;
    }

    function _processDroppedFile(file) {
        var lower = file.name.toLowerCase();
        if (!lower.endsWith('.md') && !lower.endsWith('.json')) {
            toast(t('agents.page.drop_type_error'), 'error');
            return;
        }
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var agent = _parseAndLoadAgent(file.name, ev.target.result);
                _openLoadPreview(agent, agent._source || 'generic_json');
            } catch (err) {
                toast(t('agents.page.load_error', { msg: err.message }), 'error');
            }
        };
        reader.readAsText(file);
    }

    document.addEventListener('dragenter', function (e) {
        if (!_hasFiles(e)) return;
        _dragCounter++;
        if (_dragCounter === 1) _dropOverlay.classList.add('is-active');
    });

    document.addEventListener('dragleave', function () {
        _dragCounter = Math.max(0, _dragCounter - 1);
        if (_dragCounter === 0) _dropOverlay.classList.remove('is-active');
    });

    document.addEventListener('dragover', function (e) {
        if (_hasFiles(e)) e.preventDefault();
    });

    document.addEventListener('drop', function (e) {
        if (!e.dataTransfer) return;
        e.preventDefault();
        _dragCounter = 0;
        _dropOverlay.classList.remove('is-active');

        // If a directory was dropped, scan it for agents/skills
        var dtItems = e.dataTransfer.items;
        if (dtItems && dtItems.length) {
            for (var i = 0; i < dtItems.length; i++) {
                var entry = dtItems[i].webkitGetAsEntry && dtItems[i].webkitGetAsEntry();
                if (entry && entry.isDirectory) {
                    AgentScanner.openFromDrop(dtItems);
                    return;
                }
            }
        }

        // Single file drop
        var file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file) return;
        _processDroppedFile(file);
    });

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
        } else if (action === 'share') {
            if (window.shareTeams) shareTeams.open('agent', id, btn.dataset.name || id);
        } else if (action === 'move-folder') {
            const currentFolder = btn.dataset.folderId || null;
            FolderMoveDialog.open('agents', id, currentFolder, function () { _loadAll(); });
        } else if (action === 'delete') {
            if (!confirm(t('agents.confirm_delete'))) return;
            try {
                await api.del(`/api/agents/${encodeURIComponent(id)}`);
                toast(t('agents.deleted'), 'info');
                await _loadAll();
            } catch (e) { toast(e.message, 'error'); }
        } else if (action === 'blueprint') {
            try {
                const full = await api.get(`/api/agents/${encodeURIComponent(id)}`);
                _openBlueprintModal(full);
            } catch (e) { toast(e.message, 'error'); }
        }
    });
}

function _bindBlueprintModal() {
    document.getElementById('abp-close').addEventListener('click', function () {
        document.getElementById('agent-blueprint-modal').style.display = 'none';
    });
    document.getElementById('agent-blueprint-modal').addEventListener('click', function (e) {
        if (e.target === this) this.style.display = 'none';
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.getElementById('agent-blueprint-modal').style.display !== 'none') {
            document.getElementById('agent-blueprint-modal').style.display = 'none';
        }
    });
}

function _openBlueprintModal(agent) {
    var conn = _connections.find(function (c) { return c.id === agent.connection_id; });
    var typeKey = conn ? conn.type : null;
    var typeLabel = typeKey ? (AgentCard._TYPE_LABELS[typeKey] || typeKey) : t('agents.card.no_ai');
    var connName = conn ? (conn.name || typeLabel) : t('agents.card.no_ai');
    var pillCls = typeKey ? 'agent-conn-pill--' + typeKey : 'agent-conn-pill--default';

    var agentSkills = (agent.skills || []).map(function (sid) {
        return _skills.find(function (s) { return s.id === sid; });
    }).filter(Boolean);

    var knowledgeItems = (agent.knowledge || []).map(function (kid) {
        return (_allKnowledge || []).find(function (k) { return k.id === kid; });
    }).filter(Boolean);

    var routines = agent.routines || [];
    var initial = (agent.name || '?').charAt(0).toUpperCase();
    var avatarColor = AgentCard._avatarColor(agent.name || '');

    var skillsHtml = agentSkills.length
        ? agentSkills.map(function (sk) {
            return '<div class="abp-item"><span class="abp-item-bullet"></span><span>' + esc(sk.name) + '</span></div>';
        }).join('')
        : '<span class="abp-empty">' + t('agents.blueprint.none') + '</span>';

    var knowledgeHtml = knowledgeItems.length
        ? knowledgeItems.map(function (k) {
            return '<div class="abp-item"><span class="abp-item-bullet"></span><span>' + esc(k.title) + '</span></div>';
        }).join('')
        : '<span class="abp-empty">' + t('agents.blueprint.none') + '</span>';

    var memoryHtml = '<div class="abp-cfg-row">'
        + '<span class="abp-cfg-key">' + t('agents.blueprint.status') + '</span>'
        + '<span class="abp-cfg-val' + (agent.use_memory ? ' abp-cfg-val--on' : '') + '">'
        + (agent.use_memory ? t('agents.blueprint.memory_on') : t('agents.blueprint.memory_off'))
        + '</span></div>';
    if (agent.use_memory && agent.memory_file) {
        memoryHtml += '<div class="abp-cfg-row">'
            + '<span class="abp-cfg-key">' + t('agents.blueprint.memory_file') + '</span>'
            + '<span class="abp-cfg-val abp-cfg-val--mono">' + esc(agent.memory_file) + '</span></div>';
    }

    var temp = typeof agent.temperature === 'number' ? agent.temperature : 0.7;
    var tempPct = Math.round(temp * 100);
    var agentTypeLabels = {
        generic: t('agents.modal.type_generic'),
        claude: 'Claude',
        openai: 'OpenAI',
        github: 'GitHub Copilot'
    };
    var agentTypeLabel = agentTypeLabels[agent.agent_type] || t('agents.modal.type_generic');

    var configHtml = '<div class="abp-cfg-row">'
        + '<span class="abp-cfg-key">' + t('agents.blueprint.type') + '</span>'
        + '<span class="abp-cfg-val">' + esc(agentTypeLabel) + '</span></div>'
        + '<div class="abp-cfg-row">'
        + '<span class="abp-cfg-key">' + t('agents.blueprint.temp') + '</span>'
        + '<span class="abp-temp-bar">'
        + '<span class="abp-temp-track"><span class="abp-temp-fill" style="width:' + tempPct + '%"></span></span>'
        + '<span class="abp-cfg-val">' + temp.toFixed(1) + '</span>'
        + '</span></div>';

    if (agent.agent_type === 'claude') {
        if (agent.extended_thinking !== undefined) {
            configHtml += '<div class="abp-cfg-row"><span class="abp-cfg-key">' + t('agents.blueprint.thinking') + '</span>'
                + '<span class="abp-cfg-val' + (agent.extended_thinking ? ' abp-cfg-val--on' : '') + '">'
                + (agent.extended_thinking ? 'On' : 'Off') + '</span></div>';
        }
        if (agent.cache_control !== undefined) {
            configHtml += '<div class="abp-cfg-row"><span class="abp-cfg-key">' + t('agents.blueprint.cache') + '</span>'
                + '<span class="abp-cfg-val' + (agent.cache_control ? ' abp-cfg-val--on' : '') + '">'
                + (agent.cache_control ? 'On' : 'Off') + '</span></div>';
        }
    }

    if (agent.agent_type === 'openai') {
        if (agent.response_format) {
            configHtml += '<div class="abp-cfg-row"><span class="abp-cfg-key">' + t('agents.blueprint.response_format') + '</span>'
                + '<span class="abp-cfg-val">' + esc(agent.response_format) + '</span></div>';
        }
        if (agent.tool_choice) {
            configHtml += '<div class="abp-cfg-row"><span class="abp-cfg-key">' + t('agents.blueprint.tool_choice') + '</span>'
                + '<span class="abp-cfg-val">' + esc(agent.tool_choice) + '</span></div>';
        }
    }

    var routinesHtml = routines.length
        ? routines.map(function (r) {
            var triggerLabel = r.trigger === 'cron'
                ? ('Cron · ' + esc(r.schedule || ''))
                : r.trigger === 'webhook'
                    ? t('agents.blueprint.trigger_webhook')
                    : t('agents.blueprint.trigger_manual');
            return '<div class="abp-item">'
                + '<span class="abp-item-bullet"></span>'
                + '<span>' + esc(r.name || '—') + '</span>'
                + '<span class="abp-item-meta">' + triggerLabel + '</span>'
                + '</div>';
        }).join('')
        : '<span class="abp-empty">' + t('agents.blueprint.none') + '</span>';

    document.getElementById('abp-content').innerHTML =
        '<div class="abp-header">'
        + '<div class="agent-avatar" style="background:' + esc(avatarColor) + ';width:38px;height:38px;font-size:16px;flex-shrink:0">' + esc(initial) + '</div>'
        + '<div class="abp-agent-meta">'
        + '<div class="abp-agent-name">' + esc(agent.name) + '</div>'
        + '<div class="abp-agent-desc">' + esc(agent.description || t('agents.blueprint.no_description')) + '</div>'
        + '<div class="abp-agent-badges">'
        + '<span class="agent-conn-pill ' + esc(pillCls) + '">' + esc(connName) + '</span>'
        + '</div>'
        + '</div>'
        + '</div>'
        + '<div class="abp-grid-2">'
        + '<div class="abp-section"><div class="abp-section-label">' + t('agents.blueprint.skills') + '</div>' + skillsHtml + '</div>'
        + '<div class="abp-section"><div class="abp-section-label">' + t('agents.blueprint.knowledge') + '</div>' + knowledgeHtml + '</div>'
        + '<div class="abp-section"><div class="abp-section-label">' + t('agents.blueprint.memory') + '</div>' + memoryHtml + '</div>'
        + '<div class="abp-section"><div class="abp-section-label">' + t('agents.blueprint.config') + '</div>' + configHtml + '</div>'
        + '</div>'
        + '<div class="abp-section"><div class="abp-section-label">' + t('agents.blueprint.routines') + '</div>' + routinesHtml + '</div>';

    document.getElementById('agent-blueprint-modal').style.display = 'flex';
}

init();
