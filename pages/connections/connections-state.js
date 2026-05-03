// connections-state.js — estado, carga, render y test de conexiones
'use strict';

var _connections = [];

async function loadConnections() {
    _connections = await api.get('/api/connections');
    _applyFilter();
}

function _applyFilter() {
    var f = FilterConnections.getFilter();
    var q = f.query.toLowerCase();
    var types = f.types;
    var filtered = _connections.filter(function (c) {
        var matchQ = !q || c.name.toLowerCase().indexOf(q) !== -1;
        var matchT = !types.length || types.indexOf(c.type) !== -1;
        return matchQ && matchT;
    });
    renderGrouped(filtered);
}

function renderGrouped(conns) {
    var root = document.getElementById('connections-root');
    var list = conns !== undefined ? conns : _connections;
    if (!list.length) {
        root.innerHTML = '<div class="conn-empty">' +
            (conns && conns.length < _connections.length
                ? t('connections.empty_filtered')
                : t('connections.empty_none')) + '</div>';
        return;
    }

    var order = Providers.order();
    var groups = {};
    order.forEach(function (t) { groups[t] = []; });
    list.forEach(function (c) {
        var t = c.type || order[0] || '';
        if (!groups[t]) groups[t] = [];
        groups[t].push(c);
    });

    var html = '';
    order.forEach(function (type) {
        var items = groups[type];
        if (!items || !items.length) return;
        var meta = Providers.meta(type);
        html += '<div class="conn-group" data-group="' + esc(type) + '">';
        html += '<div class="conn-group-header">';
        html += '<span class="conn-group-label conn-group-label--' + esc(meta.cls) + '">' + esc(meta.label) + '</span>';
        html += '<span class="conn-group-count">' + (items.length === 1 ? t('connections.count_one', { n: items.length }) : t('connections.count_many', { n: items.length })) + '</span>';
        html += '<button class="conn-group-test" data-group-test="' + esc(type) + '">';
        html += '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M4 2.5l9 5.5-9 5.5V2.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
        html += t('connections.test_group') + '</button></div>';
        html += '<div class="conn-group-grid">';
        items.forEach(function (c) { html += renderCard(c); });
        html += '</div></div>';
    });

    root.innerHTML = html;
}

function _fmtTokens(n) {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

function renderCard(c) {
    var sub = c.model || (c.host ? c.host : '');
    var totalTokens = (c.tokens_in || 0) + (c.tokens_out || 0);
    var tokenBadge = totalTokens
        ? '<span class="conn-token-badge" title="' + _fmtTokens(c.tokens_in || 0) + ' in / ' + _fmtTokens(c.tokens_out || 0) + ' out">' + _fmtTokens(totalTokens) + ' tok</span>'
        : '';
    return '<article class="conn-card" data-conn-id="' + esc(c.id) + '">' +
        '<div class="conn-card-body">' +
        '<div class="conn-card-name-row">' +
        '<div class="conn-card-name">' + esc(c.name) + '</div>' +
        tokenBadge +
        '</div>' +
        (sub ? '<div class="conn-card-sub">' + esc(sub) + '</div>' : '') +
        '<div class="conn-card-status"></div>' +
        '</div>' +
        '<footer class="conn-card-footer">' +
        '<button class="cca-btn cca-btn--test" data-action="test" data-id="' + esc(c.id) + '">' +
        '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M4 2.5l9 5.5-9 5.5V2.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' + t('connections.actions.test') + '</button>' +
        '<button class="cca-btn" data-action="edit" data-id="' + esc(c.id) + '">' +
        '<svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M13.5 3.5l3 3L7 16H4v-3L13.5 3.5z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' + t('connections.actions.edit') + '</button>' +
        '<button class="cca-btn cca-btn--delete" data-action="delete" data-id="' + esc(c.id) + '" title="' + t('connections.actions.delete') + '">' +
        '<svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M5 6h10M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6m1.5 0-.5 10a1.5 1.5 0 0 1-1.5 1.4h-3A1.5 1.5 0 0 1 7 16L6.5 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button></footer></article>';
}

function setStatus(id, state, msg, detail) {
    var card = document.querySelector('[data-conn-id="' + CSS.escape(id) + '"]');
    if (!card) return;
    card.dataset.status = state;
    var el = card.querySelector('.conn-card-status');
    if (!el) return;
    if (state === 'testing') {
        el.removeAttribute('data-ok');
        el.textContent = t('connections.testing');
    } else if (state === 'ok') {
        el.dataset.ok = 'true';
        el.textContent = t('connections.test_ok') + (msg && msg !== 'OK' && !msg.startsWith('OK') ? ' — ' + msg : '');
    } else if (state === 'error') {
        el.dataset.ok = 'false';
        var text = t('connections.test_error');
        if (msg && msg !== 'Error') text += ': ' + msg;
        if (detail && detail !== msg) text += ' — ' + detail;
        el.textContent = text;
    } else {
        el.removeAttribute('data-ok');
        el.textContent = '';
    }
}

async function testConnections(ids) {
    ids.forEach(function (id) { setStatus(id, 'testing'); });
    try {
        var results = await api.post('/api/connections/test-all', { ids: ids });
        results.forEach(function (r) {
            setStatus(r.id, r.ok ? 'ok' : 'error', r.message || (r.ok ? 'OK' : 'Error'), r.detail);
        });
    } catch (e) {
        ids.forEach(function (id) { setStatus(id, 'error', e.message); });
    }
}
