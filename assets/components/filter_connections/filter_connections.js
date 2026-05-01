// filter_connections.js — barra de filtros para la página de conexiones
'use strict';

var FilterConnections = (function () {
    var _state    = { query: '', types: [] };
    var _onChange = null;
    var _TYPES    = [];

    var _SVG_SEARCH = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    var _SVG_CLEAR  = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    function _render(mountEl) {
        var inp      = document.getElementById('fco-search');
        var hadFocus = inp && document.activeElement === inp;
        var cursor   = hadFocus ? inp.selectionStart : null;

        var hasAny = _state.query || _state.types.length > 0;

        var chips = _TYPES.map(function (t_) {
            var active = _state.types.indexOf(t_.id) !== -1;
            return '<button type="button" class="fco-chip' + (active ? ' fco-chip--active' : '') + '" data-type="' + esc(t_.id) + '">' + esc(t_.label) + '</button>';
        }).join('');

        var placeholder = window.t ? window.t('connections.filter.search_placeholder') : 'Buscar conexión…';
        var clearLabel  = window.t ? window.t('actions.clear') : 'Limpiar';
        var clearAria   = window.t ? window.t('search.clear_aria') : 'Limpiar';

        mountEl.innerHTML =
            '<div class="fco-bar">' +
              '<div class="fco-top-row">' +
                '<div class="fco-search-wrap">' +
                  _SVG_SEARCH +
                  '<input id="fco-search" class="fco-search-input" placeholder="' + placeholder + '"' +
                  ' value="' + esc(_state.query) + '" autocomplete="off"/>' +
                  (_state.query
                    ? '<button type="button" class="fco-search-clear" id="fco-clear" aria-label="' + clearAria + '">' + _SVG_CLEAR + '</button>'
                    : '') +
                '</div>' +
                (hasAny ? '<button type="button" class="fco-clear-all" id="fco-clear-all">' + clearLabel + '</button>' : '') +
              '</div>' +
              (chips ? '<div class="fco-chips-row">' + chips + '</div>' : '') +
            '</div>';

        _bindEvents(mountEl);

        if (hadFocus) {
            var ni = document.getElementById('fco-search');
            if (ni) {
                ni.focus();
                if (cursor !== null) try { ni.setSelectionRange(cursor, cursor); } catch (e) {}
            }
        }
    }

    function _bindEvents(mountEl) {
        var inp = document.getElementById('fco-search');
        if (inp) inp.addEventListener('input', function (e) {
            _state.query = e.target.value;
            _notifyAndRender(mountEl);
        });

        var clr = document.getElementById('fco-clear');
        if (clr) clr.addEventListener('click', function () {
            _state.query = '';
            _notifyAndRender(mountEl);
        });

        mountEl.querySelectorAll('[data-type]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var t   = btn.dataset.type;
                var idx = _state.types.indexOf(t);
                if (idx === -1) _state.types.push(t);
                else            _state.types.splice(idx, 1);
                _notifyAndRender(mountEl);
            });
        });

        var clearAll = document.getElementById('fco-clear-all');
        if (clearAll) clearAll.addEventListener('click', function () {
            _state = { query: '', types: [] };
            _notifyAndRender(mountEl);
        });
    }

    function _notifyAndRender(mountEl) {
        _render(mountEl);
        if (typeof _onChange === 'function') _onChange(_state);
    }

    return {
        init: function (opts) {
            var mountEl = typeof opts.mountEl === 'string'
                ? document.querySelector(opts.mountEl) : opts.mountEl;
            if (!mountEl) return;
            _onChange = opts.onChange || null;
            _TYPES    = opts.types || [];
            _state    = { query: '', types: [] };
            _render(mountEl);
        },
        getFilter: function () { return { query: _state.query, types: _state.types.slice() }; },
        reset: function (mountEl) {
            _state = { query: '', types: [] };
            var el = typeof mountEl === 'string' ? document.querySelector(mountEl) : mountEl;
            if (el) _render(el);
        },
    };
}());

window.FilterConnections = FilterConnections;
