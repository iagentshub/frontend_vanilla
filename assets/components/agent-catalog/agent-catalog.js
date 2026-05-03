// agent-catalog.js — directorio de búsqueda de agentes públicos
'use strict';

var AgentCatalog = (function () {
    var _agents = [];
    var _onFork = null;
    var _query = '';

    var _SVG_SEARCH = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    function _publicAgents() {
        return _agents.filter(function (a) { return (a.scope || 'private') === 'public'; });
    }

    function _filtered() {
        var q = _query.toLowerCase().trim();
        var pub = _publicAgents();
        if (!q) return pub;
        return pub.filter(function (a) {
            return a.name.toLowerCase().indexOf(q) !== -1 ||
                (a.description || '').toLowerCase().indexOf(q) !== -1;
        });
    }

    function _renderCard(a) {
        return '<div class="ac-card">' +
            '<div class="ac-card-body">' +
            '<div class="ac-card-name">' + esc(a.name) + '</div>' +
            '<div class="ac-card-desc">' + esc(a.description || t('agents.card.no_description')) + '</div>' +
            '</div>' +
            '<div class="ac-card-footer">' +
            '<button class="ac-fork-btn" data-id="' + esc(a.id) + '">' +
            t('agents.catalog.fork_btn') +
            '</button>' +
            '</div>' +
            '</div>';
    }

    function _renderGrid() {
        var grid = document.getElementById('ac-grid');
        if (!grid) return;
        var list = _filtered();
        if (!list.length) {
            grid.innerHTML = '<div class="ac-empty">' +
                esc(_query ? t('agents.catalog.empty_search') : t('agents.catalog.empty')) +
                '</div>';
            return;
        }
        grid.innerHTML = list.map(_renderCard).join('');
        grid.querySelectorAll('.ac-fork-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var agent = _agents.find(function (a) { return a.id === btn.dataset.id; });
                if (agent && typeof _onFork === 'function') {
                    _close();
                    _onFork(agent);
                }
            });
        });
    }

    function _open() {
        _query = '';
        var bg = document.getElementById('agent-catalog-bg');
        if (!bg) return;
        bg.style.display = 'flex';
        _renderGrid();
        var inp = document.getElementById('ac-search');
        if (inp) { inp.value = ''; setTimeout(function () { inp.focus(); }, 60); }
    }

    function _close() {
        var bg = document.getElementById('agent-catalog-bg');
        if (bg) bg.style.display = 'none';
    }

    return {
        init: function (opts) {
            _onFork = opts.onFork || null;

            var mountEl = typeof opts.mountEl === 'string'
                ? document.querySelector(opts.mountEl)
                : opts.mountEl;
            if (mountEl) mountEl.addEventListener('click', _open);

            var closeBtn = document.getElementById('ac-close');
            if (closeBtn) closeBtn.addEventListener('click', _close);

            var bg = document.getElementById('agent-catalog-bg');
            if (bg) bg.addEventListener('click', function (e) {
                if (e.target === bg) _close();
            });

            var searchEl = document.getElementById('ac-search');
            if (searchEl) {
                searchEl.addEventListener('input', function (e) {
                    _query = e.target.value;
                    _renderGrid();
                });
            }

            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') _close();
            });
        },

        setAgents: function (agents) {
            _agents = agents || [];
        },

        open: _open,
    };
}());

window.AgentCatalog = AgentCatalog;
