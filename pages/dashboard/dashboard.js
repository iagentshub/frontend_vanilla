// dashboard.js — página de inicio / resumen global
'use strict';

var _SVG_AGENTS = '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="11" r="1.2" fill="currentColor"/></svg>';
var _SVG_CONNS  = '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="4" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="4" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="13" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M4 6v2a4 4 0 0 0 4 4m0 0V6m0 6a4 4 0 0 0 4-4V6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
var _SVG_SKILLS = '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l1.5 3 3.3.5-2.4 2.3.6 3.3L8 9l-3 1.6.6-3.3L3.2 5l3.3-.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
var _SVG_MEM    = '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 2v3h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 8h5M5.5 10.5h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
var _SVG_KNOW   = '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 13V3.5A1.5 1.5 0 0 1 3.5 2H13v11H3.5A1.5 1.5 0 0 1 2 11.5v0A1.5 1.5 0 0 1 3.5 10H13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 5.5h4M5.5 7.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
var _SVG_MEM_ON = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
var _SVG_KNOW_ON= '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 13V3.5A1.5 1.5 0 0 1 3.5 2H13v11H3.5A1.5 1.5 0 0 1 2 11.5v0A1.5 1.5 0 0 1 3.5 10H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

async function init() {
    await window.requireAuth();
    renderNav('nav-root', 'dashboard');

    var results = await Promise.all([
        api.get('/api/agents?scope=private').catch(function () { return []; }),
        api.get('/api/connections').catch(function () { return []; }),
        api.get('/api/skills?scope=private').catch(function () { return []; }),
        api.get('/api/memory').catch(function () { return []; }),
        api.get('/api/knowledge').catch(function () { return []; }),
    ]);

    var agents      = results[0];
    var connections = results[1];
    var skills      = results[2];
    var memories    = results[3];
    var knowledge   = results[4];

    if (window.i18n) {
        window.i18n.ready(function () { _render(agents, connections, skills, memories, knowledge); });
        window.i18n.onLangChange(function () { _render(agents, connections, skills, memories, knowledge); });
    } else {
        _render(agents, connections, skills, memories, knowledge);
    }

}

function _render(agents, connections, skills, memories, knowledge) {
    _renderStats(agents, connections, skills, memories, knowledge);
    _renderTokens(connections);
    _renderComposition(agents);
    _renderRecent(agents, connections);
}

// ── Stat cards ──────────────────────────────────────────────────────────────

function _renderStats(agents, connections, skills, memories, knowledge) {
    var cards = [
        { icon: _SVG_AGENTS, value: agents.length,      label: t('dashboard.stats.agents'),      href: '/agents' },
        { icon: _SVG_CONNS,  value: connections.length, label: t('dashboard.stats.connections'), href: '/connections' },
        { icon: _SVG_SKILLS, value: skills.length,      label: t('dashboard.stats.skills'),      href: '/knowledge' },
        { icon: _SVG_MEM,    value: memories.length,    label: t('dashboard.stats.memory'),      href: '/memory' },
        { icon: _SVG_KNOW,   value: (knowledge || []).length, label: t('dashboard.stats.knowledge'), href: '/knowledge' },
    ];
    var root = document.getElementById('dash-stats');
    if (!root) return;
    root.innerHTML = cards.map(function (c) {
        return '<a class="dash-stat-card" href="' + c.href + '">' +
            '<div class="dash-stat-icon">' + c.icon + '</div>' +
            '<div class="dash-stat-body">' +
            '<div class="dash-stat-value">' + c.value + '</div>' +
            '<div class="dash-stat-label">' + esc(c.label) + '</div>' +
            '</div>' +
            '</a>';
    }).join('');
}

// ── Token usage ──────────────────────────────────────────────────────────────

function _formatTokens(n) {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
}

function _renderTokens(connections) {
    var root = document.getElementById('dash-tokens-body');
    if (!root) return;

    var withUsage = connections
        .map(function (c) { return { name: c.name || c.type, type: c.type, total: (c.tokens_in || 0) + (c.tokens_out || 0) }; })
        .filter(function (c) { return c.total > 0; })
        .sort(function (a, b) { return b.total - a.total; });

    var grandTotal = withUsage.reduce(function (s, c) { return s + c.total; }, 0);
    var maxVal = withUsage.length ? withUsage[0].total : 0;

    // Total display
    var totalEl = document.getElementById('dash-tokens-total');
    if (totalEl) {
        totalEl.innerHTML = '<span class="dash-token-total-value">' + _formatTokens(grandTotal) + '</span>' +
            '<span class="dash-token-total-label">' + esc(t('dashboard.tokens.unit_k').replace('k ', '')) + '</span>';
    }

    if (!withUsage.length) {
        root.innerHTML = '<div class="dash-empty">' + esc(t('dashboard.tokens.no_activity')) + '</div>';
        return;
    }

    root.innerHTML = '<div class="dash-token-list">' +
        withUsage.slice(0, 5).map(function (c) {
            var pct = maxVal > 0 ? Math.round((c.total / maxVal) * 100) : 0;
            return '<div class="dash-token-row">' +
                '<div class="dash-token-row-head">' +
                '<span class="dash-token-name">' + esc(c.name) + '</span>' +
                '<span class="dash-token-amount">' + _formatTokens(c.total) + '</span>' +
                '</div>' +
                '<div class="dash-token-bar-track">' +
                '<div class="dash-token-bar-fill" style="width:' + pct + '%"></div>' +
                '</div>' +
                '</div>';
        }).join('') +
        '</div>';
}

// ── Agent composition ────────────────────────────────────────────────────────

var _TYPE_LABELS = { claude: 'Claude', openai: 'OpenAI', github: 'GitHub Copilot', generic: 'Genérico' };

function _renderComposition(agents) {
    var root = document.getElementById('dash-composition-body');
    if (!root) return;

    if (!agents.length) {
        root.innerHTML = '<div class="dash-empty">' + esc(t('dashboard.composition.no_agents')) + '</div>';
        return;
    }

    var counts = { claude: 0, openai: 0, github: 0, generic: 0 };
    var withMemory = 0;
    var withKnowledge = 0;
    agents.forEach(function (a) {
        var type = counts.hasOwnProperty(a.agent_type) ? a.agent_type : 'generic';
        counts[type]++;
        if (a.use_memory) withMemory++;
        if (a.knowledge && a.knowledge.length) withKnowledge++;
    });

    var maxCount = Math.max.apply(null, Object.values(counts));
    var types = ['claude', 'openai', 'github', 'generic'];

    var html = '<div class="dash-type-list">' +
        types.filter(function (k) { return counts[k] > 0; }).map(function (k) {
            var pct = maxCount > 0 ? Math.round((counts[k] / maxCount) * 100) : 0;
            return '<div class="dash-type-row">' +
                '<div class="dash-type-row-head">' +
                '<span class="dash-type-name">' + esc(_TYPE_LABELS[k] || k) + '</span>' +
                '<span class="dash-type-count">' + counts[k] + '</span>' +
                '</div>' +
                '<div class="dash-type-bar-track">' +
                '<div class="dash-type-bar-fill dash-type-bar-fill--' + k + '" style="width:' + pct + '%"></div>' +
                '</div>' +
                '</div>';
        }).join('') +
        '</div>';

    var badges = '';
    if (withMemory > 0) {
        badges += '<div class="dash-memory-badge">' + _SVG_MEM_ON +
            withMemory + ' ' + esc(t('dashboard.composition.with_memory')) +
            '</div>';
    }
    if (withKnowledge > 0) {
        badges += '<div class="dash-memory-badge dash-knowledge-badge">' + _SVG_KNOW_ON +
            withKnowledge + ' ' + esc(t('dashboard.composition.with_knowledge')) +
            '</div>';
    }
    if (badges) html += '<div class="dash-badges-row">' + badges + '</div>';

    root.innerHTML = html;
}

// ── Recent agents ────────────────────────────────────────────────────────────

function _renderRecent(agents, connections) {
    var root = document.getElementById('dash-recent-grid');
    if (!root) return;

    if (!agents.length) {
        root.innerHTML = '<div class="dash-empty">' + esc(t('dashboard.recent.empty')) + '</div>';
        return;
    }

    var sorted = agents.slice().sort(function (a, b) {
        return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '');
    });

    var connIds = {};
    connections.forEach(function (c) { connIds[c.id] = true; });

    root.innerHTML = sorted.slice(0, 4).map(function (a) {
        var type = a.agent_type || 'generic';
        var hasConn = !!(a.connection_id && connIds[a.connection_id]);
        return '<div class="dash-agent-card" data-agent-id="' + esc(a.id) + '">' +
            '<div class="dash-agent-card-body">' +
            '<div class="dash-agent-card-name">' + esc(a.name) + '</div>' +
            '<span class="dash-agent-type-badge dash-agent-type-badge--' + esc(type) + '">' + esc(_TYPE_LABELS[type] || type) + '</span>' +
            (a.description ? '<div class="dash-agent-card-desc">' + esc(a.description) + '</div>' : '') +
            '</div>' +
            (hasConn ? '<div class="dash-agent-card-footer">' +
                '<button class="dash-chat-btn" data-chat-id="' + esc(a.id) + '">' +
                esc(t('dashboard.recent.chat_btn')) +
                '</button></div>' : '') +
            '</div>';
    }).join('');

    root.addEventListener('click', function (e) {
        var chatBtn = e.target.closest('[data-chat-id]');
        if (chatBtn) {
            e.stopPropagation();
            window.location.href = '/agents';
            return;
        }
        var card = e.target.closest('[data-agent-id]');
        if (card) window.location.href = '/agents';
    });
}

init();
