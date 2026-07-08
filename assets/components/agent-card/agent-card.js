// agent-card.js — renderizado de cards de agente
'use strict';

var _SVG_FORK_AGENT = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none">' +
    '<circle cx="8" cy="2.5" r="1.5" stroke="currentColor" stroke-width="1.3"/>' +
    '<circle cx="3" cy="13.5" r="1.5" stroke="currentColor" stroke-width="1.3"/>' +
    '<circle cx="13" cy="13.5" r="1.5" stroke="currentColor" stroke-width="1.3"/>' +
    '<path d="M8 4v3L3 12M8 7l5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
    '</svg>';
var _SVG_LINK_AGENT = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none">' +
    '<path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
    '<path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
    '</svg>';
var _SVG_SYNC_AGENT = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none">' +
    '<path d="M13.5 2.5v4h-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M2.5 13.5v-4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M13.5 6.5A6 6 0 0 0 4 4L2.5 5.5M2.5 9.5A6 6 0 0 0 12 12l1.5-1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
    '</svg>';

var AgentCard = {
    _TYPE_LABELS: { openai: 'OpenAI', claude: 'Claude', gemini: 'Gemini', ollama: 'Ollama' },
    _AVATAR_COLORS: ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#db2777', '#0f766e'],

    _avatarColor: function (name) {
        var code = 0;
        for (var i = 0; i < (name || '').length; i++) code += name.charCodeAt(i);
        return this._AVATAR_COLORS[code % this._AVATAR_COLORS.length];
    },

    _fmtTokens: function (n) {
        if (!n) return '0';
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return String(n);
    },

    _originBadge: function (originType) {
        if (!originType || originType === 'owner') return '';
        var text = originType === 'linked'
            ? (window.t ? t('agents.origin.linked') : 'Enlazado')
            : originType === 'fork'
                ? (window.t ? t('agents.origin.fork') : 'Fork')
                : '';
        if (!text) return '';
        return '<span class="origin-badge origin-badge--' + originType + '">' + esc(text) + '</span>';
    },

    render: function (agent, connections, skills, connStatus) {
        var isLinkedOrigin = agent.origin_type === 'linked';
        var isPublic = agent.scope === 'public';
        // Para agentes linked, usar la conexión personal del usuario (preferencia) si está configurada
        var effectiveConnId = (isLinkedOrigin && agent._pref_conn_id)
            ? agent._pref_conn_id
            : agent.connection_id;
        var conn = connections.find(function (c) { return c.id === effectiveConnId; });
        var typeKey = conn ? conn.type : null;
        var chatDisabled = !conn || (connStatus && connStatus[conn.id] === false);
        var chatTitle = !conn
            ? t('agents.card.chat_no_conn')
            : (connStatus && connStatus[conn.id] === false ? t('agents.card.chat_conn_error') : '');
        var connLabel = typeKey
            ? (AgentCard._TYPE_LABELS[typeKey] || typeKey)
            : (isPublic ? t('agents.card.use_your_ai') : t('agents.card.no_ai'));
        var pillCls = typeKey ? 'agent-conn-pill--' + esc(typeKey) : (isPublic ? 'agent-conn-pill--usatia' : 'agent-conn-pill--default');

        var initial = (agent.name || '?').charAt(0).toUpperCase();
        var avatarColor = AgentCard._avatarColor(agent.name || '');

        var _BLOCKED_LABELS = ['draft', 'quarantine', 'archived', 'delete'];
        var agentLabels = agent.labels || ['private'];
        var isBlocked = _BLOCKED_LABELS.some(function (bl) { return agentLabels.indexOf(bl) !== -1; });
        var blockingLabel = isBlocked ? agentLabels.find(function (l) { return _BLOCKED_LABELS.indexOf(l) !== -1; }) : null;

        // Badges de propiedad: solo aparecen en modo grupo
        var inGroupMode = !!(window._activeGroupId);
        var ownerBadge = '';
        if (inGroupMode) {
            if (agent._shared) {
                var ownerLabel = agent.owner_id ? '@' + agent.owner_id : (t('teams.sharing.shared_badge') || 'Compartido');
                ownerBadge = '<a class="res-badge res-badge--shared res-badge--owner-icon" href="/u/' + esc(agent.owner_id) + '" title="' + esc(ownerLabel) + '" onclick="event.stopPropagation()" tabindex="-1">' +
                    '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.8" stroke="currentColor" stroke-width="1.5"/><path d="M2 14c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
                    '</a>';
            } else {
                ownerBadge = '<span class="res-badge res-badge--mine">' + (t('agents.card.badge_mine') || 'Tuyo') + '</span>';
            }
        }

        var originBadge = AgentCard._originBadge(agent.origin_type);

        var socialBadge = agent._social_public
            ? '<span class="agent-scope-badge agent-scope-badge--social" title="' + esc(agent._social_category || '') + '">' +
            '<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M8 1.5C6 4 5 6 5 8s1 4 3 6.5M8 1.5C10 4 11 6 11 8s-1 4-3 6.5M1.5 8h13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' +
            '</span>'
            : '';
        var linkBadge = '';
        if (agentLabels.indexOf('linked') !== -1) {
            if (agent._linked_broken) {
                linkBadge = '<span class="agent-scope-badge agent-scope-badge--link-broken">Enlace roto</span>';
            } else if (agent._linked_to_user) {
                linkBadge = '<span class="agent-scope-badge agent-scope-badge--linked">Enlace · @' + esc(agent._linked_to_user) + '</span>';
            }
        }
        var starsBadge = (agent._social_stars > 0)
            ? '<span class="agent-scope-badge agent-scope-badge--stars" title="Estrellas">★ ' + agent._social_stars + '</span>'
            : '';
        var verifiedBadge = agent._social_verified
            ? '<span class="agent-scope-badge agent-scope-badge--verified" title="Verificado por el equipo de iAgentsHub">' +
            '<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 4L13 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            ' Verificado</span>'
            : '';

        var totalTokens = (agent.tokens_in || 0) + (agent.tokens_out || 0);
        var tokBadge = totalTokens
            ? '<span class="agent-tok-badge" title="' + totalTokens.toLocaleString() + ' tokens">' + AgentCard._fmtTokens(totalTokens) + ' tok</span>'
            : '';

        if (isBlocked) {
            chatDisabled = true;
            chatTitle = window.LABELS ? LABELS.getLabel(blockingLabel) : blockingLabel;
        }

        // Label chips: mostrar todos los grupos incluido privado/público
        var labelChips = (window.LABELS && agentLabels.length)
            ? LABELS.renderChips(agentLabels, { hide: [] })
            : '';
        var labelsRow = labelChips
            ? '<div class="label-chips-row agent-label-chips">' + labelChips + '</div>'
            : '';

        var dragAttrs = (!isPublic && !agent._shared)
            ? ' draggable="true" data-drag-id="' + esc(agent.id) + '" data-drag-section="agents"'
            : '';

        return '<div class="agent-card' + (isBlocked ? ' agent-card--blocked' : '') + '"' + dragAttrs + '>' +
            '<div class="agent-card-body">' +
            '<div class="agent-card-top">' +
            '<div class="agent-avatar" style="background:' + avatarColor + '">' + esc(initial) + '</div>' +
            '<div class="agent-card-info">' +
            '<div class="agent-card-name-row">' +
            '<span class="agent-card-name" title="' + esc(agent.name) + '">' + esc(agent.name) + '</span>' +
            ownerBadge + originBadge + socialBadge + linkBadge + starsBadge + verifiedBadge +
            '</div>' +
            '<div class="agent-card-meta">' +
            '<span class="agent-conn-pill ' + pillCls + '">' + esc(connLabel) + '</span>' +
            tokBadge +
            '</div>' +
            '</div>' +
            '</div>' +
            '<p class="agent-card-desc">' + esc(agent.description || t('agents.card.no_description')) + '</p>' +
            labelsRow +
            '</div>' +
            '<div class="agent-card-footer">' +
            '<button class="agent-action-chat" data-action="chat" data-id="' + esc(agent.id) + '"' +
            (chatDisabled ? ' disabled title="' + esc(chatTitle) + '"' : '') + '>' +
            '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M14 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l2 2 2-2h5a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
            t('agents.card.chat') +
            '</button>' +
            '<div class="agent-card-actions-right">' +
            '<button class="agent-action-icon" data-action="blueprint" data-id="' + esc(agent.id) + '" title="' + t('agents.blueprint.view_btn') + '">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1.5 8C1.5 8 4 3.5 8 3.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/></svg>' +
            '</button>' +
            (isLinkedOrigin ?
                // Agente enlazado vía workspace compartido: exportar + definir conexión personal
                '<button class="agent-action-icon" data-action="export" data-id="' + esc(agent.id) + '" title="' + (window.t ? t('actions.export') : 'Exportar') + '">' +
                '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
                '</button>' +
                '<button class="agent-action-icon" data-action="set-pref-conn" data-id="' + esc(agent.id) + '" data-conn-id="' + esc(agent._pref_conn_id || '') + '" title="' + (window.t ? t('agents.card.set_my_connection') : 'Definir mi conexión') + '">' +
                '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="2.5" cy="8" r="1.5" stroke="currentColor" stroke-width="1.3"/></svg>' +
                '</button>'
                : agentLabels.indexOf('linked') !== -1 && !agent._shared ?
                    // Acceso directo (sistema antiguo): solo asignar conexión + eliminar
                    '<button class="agent-action-icon" data-action="set-conn" data-id="' + esc(agent.id) + '" data-conn-id="' + esc(agent.connection_id || '') + '" title="' + (t('agents.card.set_connection') || 'Asignar conexión') + '">' +
                    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="2.5" cy="8" r="1.5" stroke="currentColor" stroke-width="1.3"/></svg>' +
                    '</button>' +
                    '<button class="agent-action-icon agent-action-icon--danger" data-action="delete" data-id="' + esc(agent.id) + '" title="' + t('agents.card.remove_link') + '">' +
                    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                    '</button>'
                    : (
                        // Agente normal
                        (!isPublic && !agent._shared ? '<button class="agent-action-icon" data-action="edit" data-id="' + esc(agent.id) + '" title="' + t('actions.edit') + '">' +
                            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
                            '</button>' : '') +
                        (!isPublic && !agent._shared ? '<button class="agent-action-icon" data-action="share" data-id="' + esc(agent.id) + '" data-name="' + esc(agent.name) + '" title="' + (t('teams.sharing.share_with') || 'Compartir con grupo') + '">' +
                            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="12" cy="3" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="13" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="4" cy="8" r="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 3.8L5.5 7.2M10.5 12.2L5.5 8.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>' +
                            '</button>' : '') +
                        (!agent._shared ? '<button class="agent-action-icon" data-action="export" data-id="' + esc(agent.id) + '" title="' + t('actions.export') + '">' +
                            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
                            '</button>' : '') +
                        (!isPublic && !agent._shared ? '<button class="agent-action-icon" data-action="move-folder" data-id="' + esc(agent.id) + '" data-folder-id="' + esc(agent.folder_id || '') + '" title="' + (t('knowledge.folder.move_to') || 'Mover a carpeta') + '">' +
                            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1.5 13V5a1 1 0 0 1 1-1h3.5l1.5-2H13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>' +
                            '</button>' : '') +
                        (isPublic ? '<button class="agent-action-icon" data-action="fork" data-id="' + esc(agent.id) + '" title="' + (window.t ? t('labels.actions.fork') : 'Fork') + '">' + _SVG_FORK_AGENT + '</button>' : '') +
                        (isPublic ? '<button class="agent-action-icon" data-action="link" data-id="' + esc(agent.id) + '" title="' + (window.t ? t('labels.actions.link') : 'Link') + '">' + _SVG_LINK_AGENT + '</button>' : '') +
                        (!isPublic && !agent._shared ? '<button class="agent-action-icon agent-action-icon--danger" data-action="delete" data-id="' + esc(agent.id) + '" title="' + t('actions.delete') + '">' +
                            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                            '</button>' : '')
                    )) +
            '</div>' +
            '</div>' +
            '</div>';
    },

    renderGrid: function (agents, connections, skills, container, connStatus) {
        if (!agents.length) {
            container.innerHTML =
                '<div class="empty-state">' +
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="16" height="12" rx="3"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/><circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none"/><path d="M9.5 18.5h5"/></svg>' +
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
