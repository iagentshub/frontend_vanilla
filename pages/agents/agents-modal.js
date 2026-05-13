// agents-modal.js — modal de crear/editar agente
'use strict';

// ── Knowledge picker state ────────────────────────────────────────────────────
var _allKnowledge = [];
var _selectedKnowledge = [];

async function _loadKnowledgeItems() {
    try {
        _allKnowledge = await api.get('/api/knowledge');
    } catch (e) {
        _allKnowledge = [];
    }
}

function _initKnowledgePicker(selectedIds) {
    _selectedKnowledge = Array.isArray(selectedIds) ? selectedIds.slice() : [];
    _updateKnowledgeChars();
}

function _renderKnowledgePicker() {
    var list = document.getElementById('agent-knowledge-list');
    var chipsEl = document.getElementById('agent-knowledge-chips');
    var charsEl = document.getElementById('agent-knowledge-chars');
    if (!list) return;

    if (!_allKnowledge.length) {
        list.innerHTML = '<span style="font-size:12px;color:var(--ink-3)">' +
            (t('skills.knowledge.empty_urls') || 'Sin items de conocimiento.') + '</span>';
        if (chipsEl) chipsEl.innerHTML = '';
        if (charsEl) charsEl.style.display = 'none';
        return;
    }

    list.innerHTML = _allKnowledge.map(function (item) {
        var checked = _selectedKnowledge.includes(item.id) ? ' checked' : '';
        var icon = item.type === 'url' ? '🔗' : (item.source && item.source.endsWith('.pdf') ? '📄' : '📝');
        return '<label class="knowledge-picker-item">' +
            '<input type="checkbox" class="knowledge-check" data-id="' + esc(item.id) + '"' + checked + '>' +
            '<span class="knowledge-picker-icon">' + icon + '</span>' +
            '<span class="knowledge-picker-title">' + esc(item.title) + '</span>' +
            '<span class="knowledge-picker-chars">(' + _fmtKChars(item.char_count) + ')</span>' +
            '</label>';
    }).join('');

    list.querySelectorAll('.knowledge-check').forEach(function (cb) {
        cb.addEventListener('change', function () {
            var id = cb.dataset.id;
            if (cb.checked) {
                if (!_selectedKnowledge.includes(id)) _selectedKnowledge.push(id);
            } else {
                _selectedKnowledge = _selectedKnowledge.filter(function (x) { return x !== id; });
            }
            _updateKnowledgeChars();
        });
    });

    _updateKnowledgeChars();
}

function _updateKnowledgeChars() {
    var charsEl = document.getElementById('agent-knowledge-chars');
    if (!charsEl) return;
    var total = _allKnowledge
        .filter(function (i) { return _selectedKnowledge.includes(i.id); })
        .reduce(function (acc, i) { return acc + (i.char_count || 0); }, 0);
    if (total > 0) {
        var label = (t('skills.knowledge.agent_chars_total') || '~{{n}} chars adjuntos')
            .replace('{{n}}', _fmtKChars(total));
        charsEl.textContent = label;
        charsEl.style.display = '';
        charsEl.style.color = total > 8000 ? 'var(--warning, #f59e0b)' : '';
    } else {
        charsEl.style.display = 'none';
    }
}

function _fmtKChars(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k chars';
    return n + ' chars';
}

function _getSelectedKnowledge() {
    return _selectedKnowledge.slice();
}

function _openAgentModal(agent) {
    agent = agent || null;
    const isEdit = !!(agent && agent.id);
    document.getElementById('agent-modal-title').textContent = isEdit ? t('agents.modal.title_edit') : t('agents.modal.title_new');
    document.getElementById('agent-id').value = isEdit ? agent.id : '';
    document.getElementById('agent-name').value = agent ? (agent.name || '') : '';
    document.getElementById('agent-desc').value = agent ? (agent.description || '') : '';
    document.getElementById('agent-prompt').value = agent ? (agent.system_prompt || '') : '';

    const scopeField = document.getElementById('agent-scope-field');
    const scopeVal = 'private';
    const scopeRadio = document.querySelector('input[name="agent-scope"][value="' + scopeVal + '"]');
    if (scopeRadio) scopeRadio.checked = true;
    if (scopeField) scopeField.style.display = isEdit ? 'none' : '';

    // Agent type selector
    const agentTypeEl = document.getElementById('agent-type');
    if (agentTypeEl) agentTypeEl.value = agent ? (agent.agent_type || 'generic') : 'generic';
    _syncPlatformFields(agent ? (agent.agent_type || 'generic') : 'generic', agent);

    _syncConnectionSelect();
    document.getElementById('agent-connection').value = agent ? (agent.connection_id || '') : '';

    const sl = document.getElementById('agent-temp');
    sl.value = agent && agent.temperature != null ? agent.temperature : 0.7;
    document.getElementById('agent-temp-val').textContent = parseFloat(sl.value).toFixed(2);

    _initSkillPicker(agent ? (agent.skills || []) : []);
    _initKnowledgePicker(agent ? (agent.knowledge || []) : []);
    _syncMemoryFields(agent);
    _syncRoutines(agent ? (agent.routines || []) : []);

    // Open advanced section if editing a typed agent or if any advanced fields are set
    const advanced = document.getElementById('agent-advanced');
    if (advanced && isEdit) advanced.open = true;

    document.getElementById('agent-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('agent-name').focus(), 60);
}

function _closeAgentModal() {
    document.getElementById('agent-modal').style.display = 'none';
}

function _syncConnectionSelect() {
    const sel = document.getElementById('agent-connection');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">' + t('agents.modal.no_connection') + '</option>' +
        _connections.map(c => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(c.type)})</option>`).join('');
    if (cur) sel.value = cur;
}

function _syncMemoryFields(agent) {
    const cb = document.getElementById('agent-use-memory');
    const fileField = document.getElementById('memory-file-field');
    const sel = document.getElementById('agent-memory-file');
    const agentId = agent ? (agent.id || '') : '';

    cb.checked = !!(agent && agent.use_memory);
    fileField.style.display = cb.checked ? '' : 'none';

    const defaultName = agentId ? agentId + '.md' : t('agents.modal.memory_agent_name_placeholder');
    const currentFile = agent ? (agent.memory_file || '') : '';
    const defaultOpt = `<option value="">${esc(t('agents.modal.memory_default', { name: defaultName }))}</option>`;
    const fileOpts = _memories.map(m =>
        `<option value="${esc(m.filename)}"${m.filename === currentFile ? ' selected' : ''}>${esc(m.filename)}</option>`
    ).join('');
    sel.innerHTML = defaultOpt + fileOpts;
    if (currentFile) sel.value = currentFile;
}

function _syncPlatformFields(agentType, agent) {
    const sections = { claude: 'platform-claude', openai: 'platform-openai', github: 'platform-github' };
    Object.entries(sections).forEach(([type, id]) => {
        const el = document.getElementById(id);
        if (el) el.style.display = agentType === type ? '' : 'none';
    });

    // Show warning when agent type is specific (not generic)
    const warning = document.getElementById('agent-type-warning');
    if (warning) warning.style.display = agentType !== 'generic' ? '' : 'none';

    if (agentType === 'claude' && agent) {
        const thinking = document.getElementById('claude-extended-thinking');
        if (thinking) thinking.checked = !!(agent.extended_thinking);
        const cache = document.getElementById('claude-cache-control');
        if (cache) cache.checked = !!(agent.cache_control);
        const budget = document.getElementById('claude-thinking-budget');
        if (budget) budget.value = agent.thinking_budget_tokens || 10000;
        const budgetField = document.getElementById('claude-thinking-budget-field');
        if (budgetField) budgetField.style.display = agent.extended_thinking ? '' : 'none';
    } else if (agentType === 'openai' && agent) {
        const fmt = document.getElementById('openai-response-format');
        if (fmt) fmt.value = agent.response_format || 'text';
        const tc = document.getElementById('openai-tool-choice');
        if (tc) tc.value = agent.tool_choice || 'auto';
        const freq = document.getElementById('openai-freq-penalty');
        if (freq) freq.value = agent.frequency_penalty || 0;
        const pres = document.getElementById('openai-pres-penalty');
        if (pres) pres.value = agent.presence_penalty || 0;
    } else if (agentType === 'github' && agent) {
        const topic = document.getElementById('github-topic');
        if (topic) topic.value = agent.copilot_topic || '';
        const repoCtx = document.getElementById('github-repo-context');
        if (repoCtx) repoCtx.checked = !!(agent.include_repo_context);
    }
}

function _buildPlatformPayload(agentType) {
    if (agentType === 'claude') {
        const thinking = document.getElementById('claude-extended-thinking');
        const extThinking = !!(thinking && thinking.checked);
        return {
            extended_thinking: extThinking,
            thinking_budget_tokens: extThinking
                ? parseInt(document.getElementById('claude-thinking-budget').value || '10000', 10)
                : 10000,
            cache_control: !!(document.getElementById('claude-cache-control') && document.getElementById('claude-cache-control').checked),
        };
    }
    if (agentType === 'openai') {
        return {
            response_format: document.getElementById('openai-response-format').value || 'text',
            tool_choice: document.getElementById('openai-tool-choice').value || 'auto',
            frequency_penalty: parseFloat(document.getElementById('openai-freq-penalty').value || '0'),
            presence_penalty: parseFloat(document.getElementById('openai-pres-penalty').value || '0'),
        };
    }
    if (agentType === 'github') {
        return {
            copilot_topic: (document.getElementById('github-topic').value || '').trim(),
            include_repo_context: !!(document.getElementById('github-repo-context') && document.getElementById('github-repo-context').checked),
        };
    }
    return {};
}

function _bindAgentModal() {
    _bindSkillSearch();
    document.getElementById('agent-modal-close').addEventListener('click', _closeAgentModal);
    document.getElementById('agent-modal-cancel').addEventListener('click', _closeAgentModal);
    document.getElementById('agent-temp').addEventListener('input', e => {
        document.getElementById('agent-temp-val').textContent = parseFloat(e.target.value).toFixed(2);
    });
    document.getElementById('agent-use-memory').addEventListener('change', e => {
        document.getElementById('memory-file-field').style.display = e.target.checked ? '' : 'none';
    });

    // Agent type change → show/hide platform sections
    const agentTypeEl = document.getElementById('agent-type');
    if (agentTypeEl) {
        agentTypeEl.addEventListener('change', e => _syncPlatformFields(e.target.value, null));
    }

    // Extended thinking toggle → show/hide budget field
    const extThinkingEl = document.getElementById('claude-extended-thinking');
    if (extThinkingEl) {
        extThinkingEl.addEventListener('change', e => {
            const f = document.getElementById('claude-thinking-budget-field');
            if (f) f.style.display = e.target.checked ? '' : 'none';
        });
    }

    document.getElementById('agent-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('agent-save-btn');
        btn.disabled = true; btn.textContent = t('agents.modal.saving');
        const useMemory = document.getElementById('agent-use-memory').checked;
        const memFile = document.getElementById('agent-memory-file').value || null;
        const scopeChecked = document.querySelector('input[name="agent-scope"]:checked');
        const agentType = (document.getElementById('agent-type') || {}).value || 'generic';

        const payload = {
            id: document.getElementById('agent-id').value || undefined,
            name: document.getElementById('agent-name').value.trim(),
            description: document.getElementById('agent-desc').value.trim(),
            agent_type: agentType,
            connection_id: document.getElementById('agent-connection').value || null,
            system_prompt: document.getElementById('agent-prompt').value.trim(),
            temperature: parseFloat(document.getElementById('agent-temp').value),
            skills: _getSelectedSkills(),
            knowledge: _getSelectedKnowledge(),
            use_memory: useMemory,
            memory_file: useMemory ? memFile : null,
            routines: _getRoutines(),
            scope: scopeChecked ? scopeChecked.value : 'private',
            ..._buildPlatformPayload(agentType),
        };
        try {
            await api.post('/api/agents', payload);
            toast(t('agents.saved'), 'success');
            _closeAgentModal();
            await _loadAll();
        } catch (err) { toast(err.message, 'error'); }
        finally { btn.disabled = false; btn.textContent = t('agents.modal.save_btn'); }
    });
}
