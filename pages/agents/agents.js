// agents.js — inicialización y acciones de la página de agentes
'use strict';

async function init() {
    renderNav('nav-root', 'agents');
    await window.requireAuth();
    await _loadAll();
    _initFolders();   // después de loadAll para que _applyFilter no renderice vacío
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

var _SVG_FOLDER = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">' +
    '<path d="M1.5 4.5A1 1 0 012.5 3.5h3.27l1.46 1.5H13.5A1 1 0 0114.5 6v6a1 1 0 01-1 1h-11a1 1 0 01-1-1V4.5z"' +
    ' stroke="currentColor" stroke-width="1.4" fill="none"/></svg>';

function _initFolders() {
    var folderPanel = document.getElementById('af-folder-panel');
    var groupsPanel = document.getElementById('af-groups-panel');
    var btnFolders  = document.getElementById('btn-toggle-folders');
    var btnGroups   = document.getElementById('btn-toggle-groups');

    var _folderVisible = localStorage.getItem('gaia-folders-agents') !== 'false';
    var _groupsVisible = false;

    function _applyPanels() {
        if (folderPanel) folderPanel.classList.toggle('folder-panel--collapsed', !_folderVisible);
        if (groupsPanel) groupsPanel.classList.toggle('folder-panel--collapsed', !_groupsVisible);
        if (btnFolders) {
            btnFolders.innerHTML = _SVG_FOLDER;
            btnFolders.classList.toggle('folder-toggle-btn--on', _folderVisible);
            btnFolders.title = _folderVisible ? 'Ocultar carpetas' : 'Mostrar carpetas';
        }
        if (btnGroups) {
            btnGroups.classList.toggle('folder-toggle-btn--on', _groupsVisible);
            btnGroups.title = _groupsVisible ? 'Ocultar grupos' : 'Grupos de trabajo';
        }
    }

    // ── Panel de carpetas ────────────────────────────────────────────────────
    if (folderPanel) {
        var folderCtrl = KnowledgeFolders('agents', function (folderId) {
            _setActiveFolder(folderId);
            if (window._groupPanelAgents) window._groupPanelAgents.clearSelection();
        });
        folderCtrl.mount(folderPanel);
        folderCtrl.load();
        window._folderAgents = folderCtrl;
    }

    // ── Panel de grupos ──────────────────────────────────────────────────────
    if (groupsPanel && window.GroupPanel) {
        var groupCtrl = GroupPanel('agents', function (groupId) {
            _setActiveGroup(groupId);
            if (!groupId && window._folderAgents) {
                // al limpiar grupo, volver a vista normal
            }
        });
        groupCtrl.mount(groupsPanel);
        groupCtrl.load();
        window._groupPanelAgents = groupCtrl;
    }

    // ── Toggles con exclusión mutua ──────────────────────────────────────────
    if (btnFolders) {
        btnFolders.addEventListener('click', function () {
            _folderVisible = !_folderVisible;
            if (_folderVisible) _groupsVisible = false;
            localStorage.setItem('gaia-folders-agents', String(_folderVisible));
            _applyPanels();
        });
    }
    if (btnGroups) {
        btnGroups.addEventListener('click', function () {
            _groupsVisible = !_groupsVisible;
            if (_groupsVisible) _folderVisible = false;
            localStorage.setItem('gaia-folders-agents', String(_folderVisible));
            _applyPanels();
        });
    }

    _applyPanels();
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
        onUse: function (agent) {
            if (typeof openChat === 'function') openChat(agent);
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
            { icon: _SVG_GRID, label: t('agents.page.new_from_catalog'), sub: t('agents.page.new_from_catalog_sub'), steps: 1, onClick: function () { AgentCatalog.open(); } },
            { icon: _SVG_UPLOAD, label: t('agents.page.new_from_file'), sub: t('agents.page.new_from_file_sub'), steps: 2, onClick: function () { document.getElementById('agent-file-input').click(); } },
            { icon: _SVG_PLUS, label: t('agents.page.new_from_scratch'), sub: t('agents.page.new_from_scratch_sub'), steps: 1, onClick: function () { _openAgentModal(); } },
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
        } else if (action === 'set-pref-conn') {
            _openPreferenceConnModal(id, btn.dataset.connId || '');
        } else if (action === 'set-conn') {
            _openSetConnModal(id, btn.dataset.connId || '');
        } else if (action === 'share') {
            if (window.GroupShareDialog) GroupShareDialog.open('agent', id, btn.dataset.name || id, _loadAll);
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
        } else if (action === 'fork') {
            btn.disabled = true;
            try {
                const r = await api.post(`/api/agents/private/${encodeURIComponent(id)}/fork`, {});
                toast((window.t ? t('labels.actions.fork_success') : 'Copiado') + ': ' + r.name, 'success');
            } catch (e) {
                toast(window.t ? t('labels.actions.fork_error') : e.message, 'error');
                btn.disabled = false;
            }
        } else if (action === 'link') {
            btn.disabled = true;
            try {
                const r = await api.post(`/api/agents/private/${encodeURIComponent(id)}/link`, {});
                toast((window.t ? t('labels.actions.link_success') : 'Enlazado') + ': ' + r.name, 'success');
                await _loadAll();
            } catch (e) {
                toast(window.t ? t('labels.actions.link_error') : e.message, 'error');
                btn.disabled = false;
            }
        } else if (action === 'sync') {
            btn.disabled = true;
            try {
                await api.post(`/api/agents/private/${encodeURIComponent(id)}/sync`);
                toast(window.t ? t('labels.actions.sync_success') : 'Sincronizado', 'success');
                await _loadAll();
            } catch (e) {
                toast(window.t ? t('labels.actions.sync_error') : e.message, 'error');
                btn.disabled = false;
            }
        } else if (action === 'convert-fork') {
            if (!confirm('¿Convertir este enlace a fork? El agente quedará como copia independiente.')) return;
            btn.disabled = true;
            try {
                await api.post(`/api/agents/private/${encodeURIComponent(id)}/link/convert-to-fork`);
                toast(window.t ? t('labels.actions.fork_success') : 'Convertido a fork', 'success');
                await _loadAll();
            } catch (e) {
                toast(e.message, 'error');
                btn.disabled = false;
            }
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

function _openPreferenceConnModal(agentId, currentConnId) {
    var existing = document.getElementById('set-pref-conn-modal');
    if (existing) existing.remove();
    // Solo conexiones propias del usuario (no las compartidas del workspace)
    var conns = (window._connections || []).filter(function (c) { return !c._shared; });
    var opts = '<option value="">' + (t('agents.card.no_connection') || '— Sin conexión —') + '</option>' +
        conns.map(function (c) {
            return '<option value="' + esc(c.id) + '"' + (c.id === currentConnId ? ' selected' : '') + '>' + esc(c.name) + '</option>';
        }).join('');
    var modal = document.createElement('div');
    modal.id = 'set-pref-conn-modal';
    modal.className = 'modal-bg';
    modal.innerHTML =
        '<div class="modal-box" style="max-width:340px">' +
        '<div class="modal-header">' +
        '<h2 class="modal-title">' + (t('agents.card.set_my_connection') || 'Definir mi conexión') + '</h2>' +
        '<button class="modal-close" id="set-pref-conn-close"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
        '</div>' +
        '<div class="modal-body">' +
        '<p style="font-size:13px;color:var(--ink-2);margin:0 0 12px">' + (t('agents.card.set_my_connection_hint') || 'Elige tu propia conexión para chatear con este agente compartido.') + '</p>' +
        '<select class="select" id="set-pref-conn-select">' + opts + '</select>' +
        '</div>' +
        '<div class="modal-footer">' +
        '<button class="btn btn-ghost" id="set-pref-conn-cancel">' + (t('common.cancel') || 'Cancelar') + '</button>' +
        '<button class="btn btn-primary" id="set-pref-conn-save">' + (t('common.save') || 'Guardar') + '</button>' +
        '</div>' +
        '</div>';
    document.body.appendChild(modal);
    modal.querySelector('#set-pref-conn-close').addEventListener('click', function () { modal.remove(); });
    modal.querySelector('#set-pref-conn-cancel').addEventListener('click', function () { modal.remove(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    modal.querySelector('#set-pref-conn-save').addEventListener('click', async function () {
        var connId = modal.querySelector('#set-pref-conn-select').value;
        try {
            await api.put('/api/agents/' + encodeURIComponent(agentId) + '/preferences', { connection_id: connId || null });
            modal.remove();
            await _loadAll();
        } catch (e) { toast(e.message || 'Error', 'error'); }
    });
}

function _openSetConnModal(agentId, currentConnId) {
    var existing = document.getElementById('set-conn-modal');
    if (existing) existing.remove();
    var conns = (window._connections || []).filter(function (c) { return !c._shared; });
    var opts = '<option value="">' + (t('agents.card.no_connection') || '— Sin conexión —') + '</option>' +
        conns.map(function (c) {
            return '<option value="' + esc(c.id) + '"' + (c.id === currentConnId ? ' selected' : '') + '>' + esc(c.name) + '</option>';
        }).join('');
    var modal = document.createElement('div');
    modal.id = 'set-conn-modal';
    modal.className = 'modal-bg';
    modal.innerHTML =
        '<div class="modal-box" style="max-width:340px">' +
        '<div class="modal-header">' +
        '<h2 class="modal-title">' + (t('agents.card.set_connection') || 'Asignar conexión') + '</h2>' +
        '<button class="modal-close" id="set-conn-close"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
        '</div>' +
        '<div class="modal-body">' +
        '<p style="font-size:13px;color:var(--ink-2);margin:0 0 12px">' + (t('agents.card.set_connection_hint') || 'Selecciona la conexión para probar este acceso directo.') + '</p>' +
        '<select class="select" id="set-conn-select">' + opts + '</select>' +
        '</div>' +
        '<div class="modal-footer">' +
        '<button class="btn btn-ghost" id="set-conn-cancel">' + (t('common.cancel') || 'Cancelar') + '</button>' +
        '<button class="btn btn-primary" id="set-conn-save">' + (t('common.save') || 'Guardar') + '</button>' +
        '</div>' +
        '</div>';
    document.body.appendChild(modal);
    modal.querySelector('#set-conn-close').addEventListener('click', function () { modal.remove(); });
    modal.querySelector('#set-conn-cancel').addEventListener('click', function () { modal.remove(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    modal.querySelector('#set-conn-save').addEventListener('click', async function () {
        var connId = modal.querySelector('#set-conn-select').value;
        try {
            await api.put('/api/agents/' + encodeURIComponent(agentId), { connection_id: connId || null });
            modal.remove();
            await _loadAll();
        } catch (e) { toast(e.message || 'Error', 'error'); }
    });
}

init();
