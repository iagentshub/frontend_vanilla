// agents-modal.js — modal de crear/editar agente
'use strict';

function _openAgentModal(agent) {
    agent = agent || null;
    const isEdit = !!(agent && agent.id);
    document.getElementById('agent-modal-title').textContent = isEdit ? t('agents.modal.title_edit') : t('agents.modal.title_new');
    document.getElementById('agent-id').value = isEdit ? agent.id : '';
    document.getElementById('agent-name').value = agent ? (agent.name || '') : '';
    const scopeField = document.getElementById('agent-scope-field');
    const scopeVal = 'private';
    const scopeRadio = document.querySelector('input[name="agent-scope"][value="' + scopeVal + '"]');
    if (scopeRadio) scopeRadio.checked = true;
    if (scopeField) scopeField.style.display = isEdit ? 'none' : '';
    document.getElementById('agent-desc').value = agent ? (agent.description || '') : '';
    document.getElementById('agent-prompt').value = agent ? (agent.system_prompt || '') : '';
    _syncConnectionSelect();
    document.getElementById('agent-connection').value = agent ? (agent.connection_id || '') : '';
    const sl = document.getElementById('agent-temp');
    sl.value = agent && agent.temperature != null ? agent.temperature : 0.7;
    document.getElementById('agent-temp-val').textContent = parseFloat(sl.value).toFixed(2);
    _initSkillPicker(agent ? (agent.skills || []) : []);
    _syncMemoryFields(agent);
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
    document.getElementById('agent-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('agent-save-btn');
        btn.disabled = true; btn.textContent = t('agents.modal.saving');
        const useMemory = document.getElementById('agent-use-memory').checked;
        const memFile = document.getElementById('agent-memory-file').value || null;
        const scopeChecked = document.querySelector('input[name="agent-scope"]:checked');
        const payload = {
            id: document.getElementById('agent-id').value || undefined,
            name: document.getElementById('agent-name').value.trim(),
            description: document.getElementById('agent-desc').value.trim(),
            connection_id: document.getElementById('agent-connection').value || null,
            system_prompt: document.getElementById('agent-prompt').value.trim(),
            temperature: parseFloat(document.getElementById('agent-temp').value),
            skills: _getSelectedSkills(),
            use_memory: useMemory,
            memory_file: useMemory ? memFile : null,
            scope: scopeChecked ? scopeChecked.value : 'private',
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
