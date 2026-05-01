// filter_memory.js — barra de búsqueda para la página de memoria
'use strict';

var FilterMemory = (function () {
    var _state    = { query: '' };
    var _onChange = null;

    var _SVG_SEARCH = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    var _SVG_CLEAR  = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    function _render(mountEl) {
        var inp      = document.getElementById('fmem-search');
        var hadFocus = inp && document.activeElement === inp;
        var cursor   = hadFocus ? inp.selectionStart : null;

        var placeholder = window.t ? window.t('memory.filter.search_placeholder') : 'Buscar archivo…';
        var clearAria   = window.t ? window.t('memory.search.clear_aria') : 'Limpiar';

        mountEl.innerHTML =
            '<div class="fmem-bar">' +
              '<div class="fmem-search-wrap">' +
                _SVG_SEARCH +
                '<input id="fmem-search" class="fmem-search-input" placeholder="' + placeholder + '"' +
                ' value="' + esc(_state.query) + '" autocomplete="off"/>' +
                (_state.query
                  ? '<button type="button" class="fmem-search-clear" id="fmem-clear" aria-label="' + clearAria + '">' + _SVG_CLEAR + '</button>'
                  : '') +
              '</div>' +
            '</div>';

        _bindEvents(mountEl);

        if (hadFocus) {
            var ni = document.getElementById('fmem-search');
            if (ni) {
                ni.focus();
                if (cursor !== null) try { ni.setSelectionRange(cursor, cursor); } catch (e) {}
            }
        }
    }

    function _bindEvents(mountEl) {
        var inp = document.getElementById('fmem-search');
        if (inp) inp.addEventListener('input', function (e) {
            _state.query = e.target.value;
            _notifyAndRender(mountEl);
        });

        var clr = document.getElementById('fmem-clear');
        if (clr) clr.addEventListener('click', function () {
            _state.query = '';
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
            _state    = { query: '' };
            _render(mountEl);
        },
        getFilter: function () { return { query: _state.query }; },
        reset: function (mountEl) {
            _state = { query: '' };
            var el = typeof mountEl === 'string' ? document.querySelector(mountEl) : mountEl;
            if (el) _render(el);
        },
    };
}());

window.FilterMemory = FilterMemory;
