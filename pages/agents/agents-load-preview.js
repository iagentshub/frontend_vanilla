// agents-load-preview.js — modal de vista previa antes de importar un agente
'use strict';

var _lpAgent = null;
var _lpSourceFmt = null;

var _LP_AVATAR_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#db2777', '#0f766e'];

function _lp_avatarColor(name) {
    var code = 0;
    for (var i = 0; i < (name || '').length; i++) code += name.charCodeAt(i);
    return _LP_AVATAR_COLORS[code % _LP_AVATAR_COLORS.length];
}

function _lp_formatLabel(sourceFmt) {
    var map = {
        native:               { label: 'iAgentsHub',       color: 'rgba(79,70,229,.12)',   textColor: '#4f46e5' },
        claude_code:          { label: 'Claude Code',      color: 'rgba(217,119,6,.12)',   textColor: '#b45309' },
        claude_json:          { label: 'Claude JSON',      color: 'rgba(217,119,6,.12)',   textColor: '#b45309' },
        openai_assistant:     { label: 'OpenAI Assistant', color: 'rgba(5,150,105,.12)',   textColor: '#059669' },
        github_copilot_agent: { label: 'GitHub Copilot',  color: 'rgba(107,114,128,.12)', textColor: '#6b7280' },
        github_copilot_free:  { label: 'GitHub Copilot',  color: 'rgba(107,114,128,.12)', textColor: '#6b7280' },
    };
    return map[sourceFmt] || { label: t('agents.preview.source_generic'), color: 'var(--surface-2)', textColor: 'var(--ink-2)' };
}

function _lp_renderHeader(agent, sourceFmt) {
    var fmt = _lp_formatLabel(sourceFmt);
    var name = agent.name || t('agents.preview.unnamed');
    var initial = (name[0] || '?').toUpperCase();
    var color = _lp_avatarColor(name);
    var agentTypeLabel = {
        claude:  t('agents.modal.type_claude'),
        openai:  t('agents.modal.type_openai'),
        github:  t('agents.modal.type_github'),
        generic: t('agents.modal.type_generic'),
    }[agent.agent_type] || t('agents.modal.type_generic');

    return '<div class="lp-format-badge" style="background:' + fmt.color + ';color:' + fmt.textColor + '">'
        + esc(t('agents.preview.detected_format')) + ': <strong>' + esc(fmt.label) + '</strong>'
        + '</div>'
        + '<div class="lp-agent-header">'
        +   '<div class="lp-avatar" style="background:' + esc(color) + '">' + esc(initial) + '</div>'
        +   '<div class="lp-agent-info">'
        +     '<div class="lp-agent-name">' + esc(name) + '</div>'
        +     (agent.description ? '<div class="lp-agent-desc">' + esc(agent.description) + '</div>' : '')
        +     '<span class="agent-chip agent-chip--skill" style="margin-top:4px">' + esc(agentTypeLabel) + '</span>'
        +   '</div>'
        + '</div>';
}

function _lp_renderPrompt(agent) {
    var prompt = (agent.system_prompt || '').trim();
    if (!prompt) {
        return '<span class="input-hint">' + esc(t('agents.preview.no_prompt')) + '</span>';
    }
    var MAX = 300;
    var preview = prompt.length > MAX ? prompt.slice(0, MAX) + '…' : prompt;
    var countHint = prompt.length > MAX
        ? '<div class="input-hint" style="margin-top:6px">' + prompt.length + ' ' + esc(t('agents.preview.chars_total')) + '</div>'
        : '';
    return '<div class="lp-section-title">' + esc(t('agents.preview.section_prompt')) + '</div>'
        + '<pre class="lp-prompt-preview">' + esc(preview) + '</pre>'
        + countHint;
}

function _lp_renderSkills(agent) {
    var ids = agent.skills || [];
    var header = '<div class="lp-section-title">' + esc(t('agents.preview.section_skills')) + '</div>';
    if (!ids.length) {
        return header + '<span class="input-hint">' + esc(t('agents.preview.no_skills')) + '</span>';
    }
    var chips = ids.map(function (id) {
        var sk = (_skills || []).find(function (s) { return s.id === id; });
        if (sk) {
            return '<span class="agent-chip agent-chip--skill">'
                + (sk.icon ? esc(sk.icon) + ' ' : '') + esc(sk.name) + '</span>';
        }
        return '<span class="lp-chip-missing" title="' + esc(id) + '">⚠ ' + esc(id) + '</span>';
    }).join('');
    return header + '<div class="lp-chips-row">' + chips + '</div>';
}

function _lp_renderMemory(agent) {
    var header = '<div class="lp-section-title" style="margin-bottom:0">' + esc(t('agents.preview.section_memory')) + '</div>';
    if (!agent.use_memory) {
        return '<div class="lp-inline-row">' + header
            + '<span class="input-hint">' + esc(t('agents.preview.memory_off')) + '</span>'
            + '</div>';
    }
    var fileLabel = agent.memory_file ? agent.memory_file : t('agents.preview.memory_default_file');
    return '<div class="lp-inline-row">' + header
        + '<span class="lp-memory-on">&#10003; ' + esc(fileLabel) + '</span>'
        + '</div>';
}

function _lp_renderRoutines(agent) {
    var routines = agent.routines || [];
    var header = '<div class="lp-section-title" style="margin-bottom:0">' + esc(t('agents.preview.section_routines')) + '</div>';
    if (!routines.length) {
        return '<div class="lp-inline-row">' + header
            + '<span class="input-hint">' + esc(t('agents.preview.no_routines')) + '</span>'
            + '</div>';
    }
    var countStr = t('agents.preview.routines_count', { n: routines.length });
    var headerRow = '<div class="lp-inline-row" style="margin-bottom:8px">' + header
        + '<span class="input-hint">' + esc(countStr) + '</span>'
        + '</div>';
    var rows = routines.map(function (r) {
        var triggerLabel = r.trigger_type === 'cron'
            ? (r.schedule || t('agents.modal.routine_trigger_cron'))
            : r.trigger_type === 'webhook'
                ? t('agents.modal.routine_trigger_webhook')
                : t('agents.modal.routine_trigger_manual');
        var triggerCls = 'routine-badge routine-badge--' + (r.trigger_type || 'manual');
        return '<div class="lp-routine-row">'
            + '<span class="lp-routine-name">' + esc(r.name || '(sin nombre)') + '</span>'
            + '<span class="' + triggerCls + '">' + esc(triggerLabel) + '</span>'
            + '</div>';
    }).join('');
    return headerRow + rows;
}

function _lp_cfgRow(label, value) {
    return '<div class="lp-cfg-row">'
        + '<span class="lp-cfg-label">' + label + '</span>'
        + '<span class="lp-cfg-value">' + value + '</span>'
        + '</div>';
}

function _lp_renderConfig(agent) {
    var rows = [];
    if (agent.model) {
        rows.push(_lp_cfgRow(esc(t('agents.preview.config_model')), esc(agent.model)));
    }
    if (agent.temperature != null) {
        rows.push(_lp_cfgRow(esc(t('agents.modal.field_temp')), parseFloat(agent.temperature).toFixed(2)));
    }
    if (agent.agent_type === 'claude') {
        if (agent.extended_thinking) {
            rows.push(_lp_cfgRow(esc(t('agents.modal.claude_extended_thinking')),
                '&#10003; (' + (agent.thinking_budget_tokens || 10000) + ' tokens)'));
        }
        if (agent.cache_control) {
            rows.push(_lp_cfgRow(esc(t('agents.modal.claude_prompt_cache')), '&#10003;'));
        }
    }
    if (agent.agent_type === 'openai') {
        if (agent.response_format && agent.response_format !== 'text') {
            rows.push(_lp_cfgRow(esc(t('agents.modal.openai_response_format')), esc(agent.response_format)));
        }
        if (agent.tool_choice && agent.tool_choice !== 'auto') {
            rows.push(_lp_cfgRow(esc(t('agents.modal.openai_tool_choice')), esc(agent.tool_choice)));
        }
    }
    if (agent.agent_type === 'github' && agent.copilot_topic) {
        rows.push(_lp_cfgRow(esc(t('agents.modal.github_topic')), esc(agent.copilot_topic)));
    }
    if (!rows.length) return '';
    return '<div class="lp-section-title">' + esc(t('agents.preview.section_config')) + '</div>'
        + '<div class="lp-config-grid">' + rows.join('') + '</div>';
}

function _lp_warning(html) {
    return '<div class="lp-warning-item">'
        + '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;margin-top:2px">'
        + '<path d="M8 1.5L1 14.5h14L8 1.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
        + '<path d="M8 6v4M8 11.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
        + '</svg>'
        + '<span>' + html + '</span>'
        + '</div>';
}

function _lp_renderWarnings(agent) {
    var items = [];

    var ids = agent.skills || [];
    var missing = ids.filter(function (id) {
        return !(_skills || []).find(function (s) { return s.id === id; });
    });
    if (missing.length) {
        var label = t('agents.preview.warn_skills_missing', { n: missing.length });
        var codeList = missing.map(function (id) {
            return '<code>' + esc(id) + '</code>';
        }).join(', ');
        items.push(_lp_warning(esc(label) + ': ' + codeList));
    }

    if (agent.model) {
        var model = agent.model.toLowerCase();
        var connMatch = (_connections || []).find(function (c) {
            return (c.model || '').toLowerCase() === model
                || (c.name || '').toLowerCase().includes(model);
        });
        if (!connMatch) {
            items.push(_lp_warning(esc(t('agents.preview.warn_no_connection', { model: agent.model }))));
        }
    }

    if (!items.length) return '';
    return '<div class="lp-warnings-title">' + esc(t('agents.preview.warnings_title')) + '</div>'
        + items.join('');
}

function _lp_renderAll(agent, sourceFmt) {
    document.getElementById('lp-header').innerHTML   = _lp_renderHeader(agent, sourceFmt);
    document.getElementById('lp-prompt').innerHTML   = _lp_renderPrompt(agent);
    document.getElementById('lp-skills').innerHTML   = _lp_renderSkills(agent);
    document.getElementById('lp-memory').innerHTML   = _lp_renderMemory(agent);
    document.getElementById('lp-routines').innerHTML = _lp_renderRoutines(agent);
    document.getElementById('lp-config').innerHTML   = _lp_renderConfig(agent);

    var warnings = _lp_renderWarnings(agent);
    var warningSection = document.getElementById('lp-warnings-section');
    warningSection.style.display = warnings ? '' : 'none';
    document.getElementById('lp-warnings').innerHTML = warnings || '';
}

function _openLoadPreview(agent, sourceFmt) {
    _lpAgent = agent;
    _lpSourceFmt = sourceFmt || 'generic_json';
    _lp_renderAll(_lpAgent, _lpSourceFmt);
    document.getElementById('load-preview-modal').style.display = 'flex';
}

function _closeLoadPreview() {
    document.getElementById('load-preview-modal').style.display = 'none';
    _lpAgent = null;
    _lpSourceFmt = null;
}

function _bindLoadPreviewModal() {
    document.getElementById('lp-modal-close').addEventListener('click', _closeLoadPreview);
    document.getElementById('lp-btn-cancel').addEventListener('click', _closeLoadPreview);
    document.getElementById('lp-btn-confirm').addEventListener('click', function () {
        var agent = _lpAgent;
        _closeLoadPreview();
        _openAgentModal(agent);
    });
    document.getElementById('load-preview-modal').addEventListener('click', function (e) {
        if (e.target === this) _closeLoadPreview();
    });
}
