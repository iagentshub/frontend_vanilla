// filter_knowledge.js — barra de filtros para las tabs de Conocimiento
// Reutiliza clases fa-* de filter_agents.css
'use strict';

var FilterKnowledge = (function () {

    var _FILTER_LABELS = ['public','production','staging','development','test','fork','linked',
                          'favorite','draft','review','deprecated','quarantine','archived','delete'];

    var _SVG_SEARCH  = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    var _SVG_CHEVRON = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var _SVG_CLEAR   = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    var _SVG_CHECK   = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    var _uid = 0;

    function _create(mountEl, showLabels, onChange) {
        var id        = ++_uid;
        var state     = { query: '', labels: [] };
        var openPanel = false;

        var ID_SEARCH  = 'fk-search-'  + id;
        var ID_CLEAR   = 'fk-clear-'   + id;
        var ID_BTN_LBL = 'fk-btn-lbl-' + id;
        var ID_WRAP    = 'fk-wrap-'     + id;
        var ID_CLR_ALL = 'fk-clr-all-' + id;

        function _renderLabelsPanel() {
            return '<div class="fa-panel fa-panel--labels">' +
                '<div class="fa-panel-list">' +
                _FILTER_LABELS.map(function (key) {
                    var active = state.labels.indexOf(key) !== -1;
                    var color  = window.LABELS ? LABELS.getColor(key) : '#999';
                    var label  = window.LABELS ? LABELS.getLabel(key) : key;
                    return '<div class="fa-option' + (active ? ' fa-option--active' : '') + '" data-fk-lbl="' + key + '">' +
                        '<span class="fa-option-check">' + (active ? _SVG_CHECK : '') + '</span>' +
                        '<span class="fa-lbl-dot" style="background:' + color + '"></span>' +
                        '<span class="fa-option-label">' + label + '</span>' +
                        '</div>';
                }).join('') +
                '</div></div>';
        }

        function render() {
            var hasLbl = state.labels.length > 0;
            var hasAny = state.query || hasLbl;
            var placeholder = window.t ? t('agents.filter.search_placeholder') : 'Buscar...';
            var lblBtnText  = window.t ? t('labels.catalog.title') : 'Etiquetas';
            var clrText     = window.t ? t('actions.clear_filters') : 'Limpiar filtros';

            mountEl.innerHTML =
                '<div class="fa-bar">' +
                '<div class="fa-search-wrap">' +
                _SVG_SEARCH +
                '<input id="' + ID_SEARCH + '" class="fa-search-input" placeholder="' + placeholder + '"' +
                ' value="' + (state.query || '').replace(/"/g, '&quot;') + '" autocomplete="off"/>' +
                (state.query ? '<button type="button" class="fa-search-clear" id="' + ID_CLEAR + '" aria-label="Limpiar">' + _SVG_CLEAR + '</button>' : '') +
                '</div>' +
                (showLabels ?
                    '<div class="fa-filter-group">' +
                    '<div class="fa-dropdown-wrap" id="' + ID_WRAP + '">' +
                    '<button type="button" class="fa-filter-btn' + (hasLbl ? ' fa-filter-btn--active' : '') + '" id="' + ID_BTN_LBL + '">' +
                    lblBtnText + (hasLbl ? '<span class="fa-filter-count">' + state.labels.length + '</span>' : '') + _SVG_CHEVRON +
                    '</button>' +
                    (openPanel ? _renderLabelsPanel() : '') +
                    '</div></div>'
                    : '') +
                (hasAny ? '<button type="button" class="fa-clear-all" id="' + ID_CLR_ALL + '">' + clrText + '</button>' : '') +
                '</div>';

            _bindEvents();
        }

        function _notify() {
            if (typeof onChange === 'function') onChange({ query: state.query, labels: state.labels.slice() });
        }

        function _bindEvents() {
            var inp = document.getElementById(ID_SEARCH);
            if (inp) {
                inp.addEventListener('input', function (e) {
                    state.query = e.target.value;
                    _notify();
                    render();
                });
                // Restore focus position
                if (document.activeElement && document.activeElement.id === ID_SEARCH) {
                    var pos = inp.value.length;
                    try { inp.setSelectionRange(pos, pos); } catch (e) {}
                }
            }

            var clr = document.getElementById(ID_CLEAR);
            if (clr) clr.addEventListener('click', function () {
                state.query = '';
                _notify();
                render();
            });

            var clrAll = document.getElementById(ID_CLR_ALL);
            if (clrAll) clrAll.addEventListener('click', function () {
                state = { query: '', labels: [] };
                openPanel = false;
                _notify();
                render();
            });

            if (showLabels) {
                var btnLbl = document.getElementById(ID_BTN_LBL);
                if (btnLbl) {
                    btnLbl.addEventListener('click', function (e) {
                        e.stopPropagation();
                        openPanel = !openPanel;
                        render();
                    });
                }

                mountEl.querySelectorAll('[data-fk-lbl]').forEach(function (opt) {
                    opt.addEventListener('mousedown', function (e) {
                        e.preventDefault();
                        var key = opt.dataset.fkLbl;
                        var idx = state.labels.indexOf(key);
                        if (idx === -1) state.labels.push(key);
                        else state.labels.splice(idx, 1);
                        _notify();
                        render();
                    });
                });
            }

            document.addEventListener('click', function _outside(e) {
                if (!openPanel) return;
                var wrap = document.getElementById(ID_WRAP);
                if (wrap && !wrap.contains(e.target)) {
                    openPanel = false;
                    render();
                    document.removeEventListener('click', _outside);
                }
            });
        }

        render();

        return {
            getFilter: function () { return { query: state.query, labels: state.labels.slice() }; },
            reset:     function () { state = { query: '', labels: [] }; openPanel = false; render(); },
        };
    }

    return {
        create: function (opts) {
            var mountEl = typeof opts.mountEl === 'string'
                ? document.querySelector(opts.mountEl)
                : opts.mountEl;
            if (!mountEl) return null;
            return _create(mountEl, !!opts.showLabels, opts.onChange || null);
        },
    };

}());

window.FilterKnowledge = FilterKnowledge;
