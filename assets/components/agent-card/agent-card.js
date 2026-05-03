// agent-card.js — renderizado de cards de agente
'use strict';

var AgentCard = {
    _MAX_CHIPS: 3,
    _TYPE_LABELS: { openai: 'OpenAI', claude: 'Claude', gemini: 'Gemini', ollama: 'Ollama' },
    _AVATAR_COLORS: ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#db2777', '#0f766e'],

    _avatarColor: function (name) {
        var code = 0;
        for (var i = 0; i < (name || '').length; i++) code += name.charCodeAt(i);
        return this._AVATAR_COLORS[code % this._AVATAR_COLORS.length];
    },

    render: function (agent, connections, skills, connStatus) {
        var isPublic = agent.scope === 'public';
        var conn = connections.find(function (c) { return c.id === agent.connection_id; });
        var typeKey = conn ? conn.type : null;
        var chatDisabled = !conn || (connStatus && connStatus[conn.id] === false);
        var chatTitle = !conn
            ? t('agents.card.chat_no_conn')
            : (connStatus && connStatus[conn.id] === false ? t('agents.card.chat_conn_error') : '');
        var connLabel = typeKey
            ? (AgentCard._TYPE_LABELS[typeKey] || typeKey)
            : (isPublic ? t('agents.card.use_your_ai') : t('agents.card.no_ai'));
        var pillCls = typeKey ? 'agent-conn-pill--' + esc(typeKey) : (isPublic ? 'agent-conn-pill--usatia' : 'agent-conn-pill--default');

        var agentSkills = agent.skills || [];
        var visibleSkills = agentSkills.slice(0, AgentCard._MAX_CHIPS);
        var overflow = agentSkills.length - AgentCard._MAX_CHIPS;
        var skillChips = visibleSkills.map(function (sid) {
            var sk = skills.find(function (s) { return s.id === sid; });
            return sk ? '<span class="agent-chip agent-chip--skill">' + (sk.icon ? esc(sk.icon) + ' ' : '') + esc(sk.name) + '</span>' : '';
        }).join('');
        if (overflow > 0) {
            skillChips += '<span class="agent-chip agent-chip--more">+' + overflow + '</span>';
        }

        var initial = (agent.name || '?').charAt(0).toUpperCase();
        var avatarColor = AgentCard._avatarColor(agent.name || '');
        var scopeBadge = isPublic
            ? '<span class="agent-scope-badge agent-scope-badge--public">' + t('agents.scope.badge_public') + '</span>'
            : '';

        return '<div class="agent-card">' +
            '<div class="agent-card-body">' +
            '<div class="agent-card-top">' +
            '<div class="agent-avatar" style="background:' + avatarColor + '">' + esc(initial) + '</div>' +
            '<div class="agent-card-info">' +
            '<div class="agent-card-name-row">' +
            '<span class="agent-card-name" title="' + esc(agent.name) + '">' + esc(agent.name) + '</span>' +
            scopeBadge +
            '</div>' +
            '<span class="agent-conn-pill ' + pillCls + '">' + esc(connLabel) + '</span>' +
            '</div>' +
            '</div>' +
            '<p class="agent-card-desc">' + esc(agent.description || t('agents.card.no_description')) + '</p>' +
            (skillChips ? '<div class="agent-card-chips">' + skillChips + '</div>' : '') +
            '</div>' +
            '<div class="agent-card-footer">' +
            '<button class="agent-action-chat" data-action="chat" data-id="' + esc(agent.id) + '"' +
            (chatDisabled ? ' disabled title="' + esc(chatTitle) + '"' : '') + '>' +
            '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M14 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l2 2 2-2h5a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
            t('agents.card.chat') +
            '</button>' +
            '<div class="agent-card-actions-right">' +
            (!isPublic ? '<button class="agent-action-icon" data-action="edit" data-id="' + esc(agent.id) + '" title="' + t('actions.edit') + '">' +
                '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
                '</button>' : '') +
            '<button class="agent-action-icon" data-action="export" data-id="' + esc(agent.id) + '" title="' + t('actions.export') + '">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
            '</button>' +
            (!isPublic ? '<button class="agent-action-icon agent-action-icon--danger" data-action="delete" data-id="' + esc(agent.id) + '" title="' + t('actions.delete') + '">' +
                '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</button>' : '') +
            '</div>' +
            '</div>' +
            '</div>';
    },

    renderGrid: function (agents, connections, skills, container, connStatus) {
        if (!agents.length) {
            container.innerHTML =
                '<div class="empty-state">' +
                '<div class="empty-state-icon">&#129302;</div>' +
                '<p>' + t('agents.empty') + '</p>' +
                '</div>';
            return;
        }
        container.innerHTML = agents.map(function (a) {
            return AgentCard.render(a, connections, skills, connStatus);
        }).join('');
    },
};

window.AgentCard = AgentCard;
