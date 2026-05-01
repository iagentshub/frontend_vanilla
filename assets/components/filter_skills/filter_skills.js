// filter_skills.js — barra de búsqueda + filtros de scope y categoría para la página de skills
'use strict';

var FilterSkills = (function () {
    var _CATEGORY_IDS = ['ai', 'messaging', 'notes', 'productivity', 'dev', 'security', 'media', 'data', 'company'];

    var _SVG_SEARCH = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    var _SVG_CLEAR  = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    var _state    = { query: '', scope: '', categories: [] };
    var _onChange = null;

    function _categories() {
        return _CATEGORY_IDS.map(function (id) {
            return { id: id, label: t('skills.categories.' + id) };
        });
    }

    function _scopes() {
        return [
            { id: '',        label: t('skills.scope.all') },
            { id: 'public',  label: t('skills.scope.public') },
            { id: 'private', label: t('skills.scope.private') },
        ];
    }

    function _hasFilter() {
        return _state.query || _state.scope || _state.categories.length;
    }

    function _render(mountEl) {
        var inp      = document.getElementById('fsk-search');
        var hadFocus = inp && document.activeElement === inp;
        var cursor   = hadFocus ? inp.selectionStart : null;

        var segmentBtns = _scopes().map(function (s) {
            var active = _state.scope === s.id ? ' fsk-segment-btn--active' : '';
            return '<button type="button" class="fsk-segment-btn' + active + '" data-fsk-scope="' + s.id + '">' + esc(s.label) + '</button>';
        }).join('');

        var catChips = _categories().map(function (c) {
            var active = _state.categories.indexOf(c.id) >= 0 ? ' fsk-chip--active' : '';
            return '<button type="button" class="fsk-chip' + active + '" data-fsk-cat="' + c.id + '">' + esc(c.label) + '</button>';
        }).join('');

        mountEl.innerHTML =
            '<div class="fsk-bar">' +
              '<div class="fsk-top-row">' +
                '<div class="fsk-search-wrap">' +
                  _SVG_SEARCH +
                  '<input id="fsk-search" class="fsk-search-input"' +
                  ' placeholder="' + t('skills.filter.search_placeholder') + '"' +
                  ' value="' + esc(_state.query) + '" autocomplete="off"/>' +
                  (_state.query
                    ? '<button type="button" class="fsk-search-clear" id="fsk-clear" aria-label="' + t('search.clear_aria') + '">' + _SVG_CLEAR + '</button>'
                    : '') +
                '</div>' +
                '<div class="fsk-segment">' + segmentBtns + '</div>' +
                (_hasFilter()
                  ? '<button type="button" class="fsk-clear-all" id="fsk-clear-all">' + t('actions.clear') + '</button>'
                  : '') +
              '</div>' +
              (catChips
                ? '<div class="fsk-cats-row">' + catChips + '</div>'
                : '') +
            '</div>';

        _bindEvents(mountEl);

        if (hadFocus) {
            var ni = document.getElementById('fsk-search');
            if (ni) {
                ni.focus();
                if (cursor !== null) try { ni.setSelectionRange(cursor, cursor); } catch (e) {}
            }
        }
    }

    function _bindEvents(mountEl) {
        var inp = document.getElementById('fsk-search');
        if (inp) inp.addEventListener('input', function (e) {
            _state.query = e.target.value;
            _notifyAndRender(mountEl);
        });

        var clr = document.getElementById('fsk-clear');
        if (clr) clr.addEventListener('click', function () {
            _state.query = '';
            _notifyAndRender(mountEl);
        });

        var clrAll = document.getElementById('fsk-clear-all');
        if (clrAll) clrAll.addEventListener('click', function () {
            _state = { query: '', scope: '', categories: [] };
            _notifyAndRender(mountEl);
        });

        mountEl.querySelectorAll('[data-fsk-scope]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                _state.scope = btn.dataset.fskScope;
                _notifyAndRender(mountEl);
            });
        });

        mountEl.querySelectorAll('[data-fsk-cat]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id  = btn.dataset.fskCat;
                var idx = _state.categories.indexOf(id);
                if (idx >= 0) _state.categories.splice(idx, 1);
                else          _state.categories.push(id);
                _notifyAndRender(mountEl);
            });
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
            _state    = { query: '', scope: '', categories: [] };
            _render(mountEl);
        },
        getFilter: function () {
            return { query: _state.query, scope: _state.scope, categories: _state.categories.slice() };
        },
        reset: function (mountEl) {
            _state = { query: '', scope: '', categories: [] };
            var el = typeof mountEl === 'string' ? document.querySelector(mountEl) : mountEl;
            if (el) _render(el);
        },
    };
}());

window.FilterSkills = FilterSkills;
