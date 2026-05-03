// filter_agents.js — barra de filtros para la galería de agentes
'use strict';

var FilterAgents = (function () {
    var _state = { query: '', skillIds: [], connIds: [], memory: null, scope: null };
    var _data = { skills: [], connections: [] };
    var _onChange = null;
    var _openPanel = null;
    var _panelSearch = { skills: '', conn: '' };
    var _initialScope = null;

    var _SVG_SEARCH = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    var _SVG_CHEVRON = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var _SVG_CLEAR = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    var _SVG_CHECK = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    function _scopeTabs() {
        return [
            { val: null, label: t('agents.scope.all') },
            { val: 'private', label: t('agents.scope.private') },
            { val: 'public', label: t('agents.scope.public') },
        ];
    }

    function _render(mountEl) {
        var srch = document.getElementById('fa-search');
        var hadFocus = srch && document.activeElement === srch;
        var cursor = hadFocus ? srch.selectionStart : null;

        var hasSk = _state.skillIds.length > 0;
        var hasConn = _state.connIds.length > 0;
        var hasMem = _state.memory !== null;
        var hasAny = _state.query || hasSk || hasConn || hasMem;

        mountEl.innerHTML =
            '<div class="fa-bar" id="fa-bar">' +
            '<div class="fa-search-wrap">' +
            _SVG_SEARCH +
            '<input id="fa-search" class="fa-search-input" placeholder="' + t('agents.filter.search_placeholder') + '" value="' + esc(_state.query) + '" autocomplete="off"/>' +
            (_state.query ? '<button type="button" class="fa-search-clear" id="fa-search-clear" aria-label="' + t('search.clear_aria') + '">' + _SVG_CLEAR + '</button>' : '') +
            '</div>' +

            '<div class="fa-filter-group">' +

            '<div class="fa-dropdown-wrap" id="fa-wrap-skills">' +
            '<button type="button" class="fa-filter-btn' + (hasSk ? ' fa-filter-btn--active' : '') + '" id="fa-btn-skills">' +
            t('agents.filter.skills_label') + (hasSk ? '<span class="fa-filter-count">' + _state.skillIds.length + '</span>' : '') + _SVG_CHEVRON +
            '</button>' +
            (_openPanel === 'skills' ? _renderSkillsPanel() : '') +
            '</div>' +

            '<div class="fa-dropdown-wrap" id="fa-wrap-conn">' +
            '<button type="button" class="fa-filter-btn' + (hasConn ? ' fa-filter-btn--active' : '') + '" id="fa-btn-conn">' +
            t('agents.filter.connection_label') + (hasConn ? '<span class="fa-filter-count">' + _state.connIds.length + '</span>' : '') + _SVG_CHEVRON +
            '</button>' +
            (_openPanel === 'conn' ? _renderConnPanel() : '') +
            '</div>' +

            '<div class="fa-dropdown-wrap" id="fa-wrap-memory">' +
            '<button type="button" class="fa-filter-btn' + (hasMem ? ' fa-filter-btn--active' : '') + '" id="fa-btn-memory">' +
            t('agents.filter.memory_label') + (hasMem ? '<span class="fa-filter-count">1</span>' : '') + _SVG_CHEVRON +
            '</button>' +
            (_openPanel === 'memory' ? _renderMemoryPanel() : '') +
            '</div>' +

            '</div>' +

            (hasAny ? '<button type="button" class="fa-clear-all" id="fa-clear-all">' + t('actions.clear_filters') + '</button>' : '') +
            '</div>';

        _bindEvents(mountEl);

        if (hadFocus) {
            var ni = document.getElementById('fa-search');
            if (ni) {
                ni.focus();
                if (cursor !== null) try { ni.setSelectionRange(cursor, cursor); } catch (e) { }
            }
        }
    }

    function _renderSkillsPanel() {
        var q = _panelSearch.skills;
        var qLow = q.toLowerCase();
        if (!_data.skills.length) {
            return '<div class="fa-panel"><span class="fa-panel-empty">' + t('agents.filter.no_skills') + '</span></div>';
        }
        return '<div class="fa-panel fa-panel--skills" id="fa-panel-skills">' +
            _renderPanelSearch('skills', t('agents.filter.search_skill')) +
            '<div class="fa-panel-list" id="fa-plist-skills">' +
            _data.skills.map(function (sk) {
                var active = _state.skillIds.indexOf(sk.id) !== -1;
                var show = active || (qLow !== '' && sk.name.toLowerCase().indexOf(qLow) !== -1);
                return '<div class="fa-option' + (active ? ' fa-option--active' : '') + '"' +
                    ' data-filter="skill" data-id="' + esc(sk.id) + '" data-name="' + esc(sk.name.toLowerCase()) + '"' +
                    (show ? '' : ' style="display:none"') + '>' +
                    '<span class="fa-option-check">' + (active ? _SVG_CHECK : '') + '</span>' +
                    '<span class="fa-option-label">' + esc(sk.name) + '</span>' +
                    '</div>';
            }).join('') +
            '</div>' +
            '</div>';
    }

    function _renderConnPanel() {
        var q = _panelSearch.conn;
        var qLow = q.toLowerCase();
        if (!_data.connections.length) {
            return '<div class="fa-panel"><span class="fa-panel-empty">' + t('agents.filter.no_connections') + '</span></div>';
        }
        var TYPE_LABELS = { openai: 'OpenAI', claude: 'Claude', gemini: 'Gemini', ollama: 'Ollama' };
        return '<div class="fa-panel fa-panel--conn" id="fa-panel-conn">' +
            _renderPanelSearch('conn', t('agents.filter.search_connection')) +
            '<div class="fa-panel-list" id="fa-plist-conn">' +
            _data.connections.map(function (c) {
                var active = _state.connIds.indexOf(c.id) !== -1;
                var label = c.name + ' · ' + (TYPE_LABELS[c.type] || c.type);
                var show = active || (qLow !== '' && label.toLowerCase().indexOf(qLow) !== -1);
                return '<div class="fa-option' + (active ? ' fa-option--active' : '') + '"' +
                    ' data-filter="conn" data-id="' + esc(c.id) + '" data-name="' + esc(label.toLowerCase()) + '"' +
                    (show ? '' : ' style="display:none"') + '>' +
                    '<span class="fa-option-check">' + (active ? _SVG_CHECK : '') + '</span>' +
                    '<span class="fa-option-label">' + esc(label) + '</span>' +
                    '</div>';
            }).join('') +
            '</div>' +
            '</div>';
    }

    function _renderMemoryPanel() {
        var opts = [
            { val: 'true', label: t('agents.filter.memory_active') },
            { val: 'false', label: t('agents.filter.memory_none') },
        ];
        return '<div class="fa-panel fa-panel--memory" id="fa-panel-memory">' +
            opts.map(function (o) {
                var active = String(_state.memory) === o.val;
                return '<label class="fa-option' + (active ? ' fa-option--active' : '') + '">' +
                    '<span class="fa-option-check">' + (active ? _SVG_CHECK : '') + '</span>' +
                    '<span class="fa-option-label">' + esc(o.label) + '</span>' +
                    '<input type="radio" name="fa-memory" data-filter="memory" data-val="' + o.val + '"' + (active ? ' checked' : '') + ' style="display:none"/>' +
                    '</label>';
            }).join('') +
            '</div>';
    }

    function _renderPanelSearch(key, placeholder) {
        return '<div class="fa-panel-search-wrap">' +
            _SVG_SEARCH +
            '<input class="fa-panel-search" id="fa-psearch-' + key + '"' +
            ' placeholder="' + placeholder + '"' +
            ' autocomplete="off" value="' + esc(_panelSearch[key] || '') + '"/>' +
            '</div>';
    }

    function _filterPanelItems(key, q) {
        var list = document.getElementById('fa-plist-' + key);
        if (!list) return;
        var qLow = q.toLowerCase();
        list.querySelectorAll('.fa-option').forEach(function (opt) {
            var isActive = opt.classList.contains('fa-option--active');
            opt.style.display = (isActive || (qLow !== '' && (opt.dataset.name || '').indexOf(qLow) !== -1)) ? '' : 'none';
        });
    }

    function _bindEvents(mountEl) {
        var searchEl = document.getElementById('fa-search');
        if (searchEl) {
            searchEl.addEventListener('input', function (e) {
                _state.query = e.target.value;
                _notifyAndRender(mountEl, null);
            });
        }

        var clearSearch = document.getElementById('fa-search-clear');
        if (clearSearch) {
            clearSearch.addEventListener('click', function () {
                _state.query = '';
                _notifyAndRender(mountEl, null);
            });
        }

        mountEl.querySelectorAll('.fa-scope-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                var val = tab.dataset.scope || null;
                _state.scope = val;
                _openPanel = null;
                _notifyAndRender(mountEl, null);
            });
        });

        ['skills', 'conn', 'memory'].forEach(function (key) {
            var btn = document.getElementById('fa-btn-' + key);
            if (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var closing = _openPanel === key;
                    if (closing) _panelSearch[key] = '';
                    _openPanel = closing ? null : key;
                    _render(mountEl);
                    if (_openPanel && key !== 'memory') {
                        var psearch = document.getElementById('fa-psearch-' + key);
                        if (psearch) psearch.focus();
                    }
                });
            }
        });

        ['skills', 'conn'].forEach(function (key) {
            var inp = document.getElementById('fa-psearch-' + key);
            if (!inp) return;
            inp.addEventListener('input', function (e) {
                _panelSearch[key] = e.target.value;
                _filterPanelItems(key, e.target.value);
            });
        });

        mountEl.querySelectorAll('.fa-option[data-filter="skill"]').forEach(function (opt) {
            opt.addEventListener('mousedown', function (e) {
                e.preventDefault();
                var id = opt.dataset.id;
                var idx = _state.skillIds.indexOf(id);
                if (idx === -1) _state.skillIds.push(id);
                else _state.skillIds.splice(idx, 1);
                _notifyAndRender(mountEl, 'skills');
            });
        });

        mountEl.querySelectorAll('.fa-option[data-filter="conn"]').forEach(function (opt) {
            opt.addEventListener('mousedown', function (e) {
                e.preventDefault();
                var id = opt.dataset.id;
                var idx = _state.connIds.indexOf(id);
                if (idx === -1) _state.connIds.push(id);
                else _state.connIds.splice(idx, 1);
                _notifyAndRender(mountEl, 'conn');
            });
        });

        mountEl.querySelectorAll('input[data-filter="memory"]').forEach(function (inp) {
            inp.parentElement.addEventListener('click', function () {
                var val = inp.dataset.val === 'true';
                _state.memory = _state.memory === val ? null : val;
                _notifyAndRender(mountEl, null);
            });
        });

        var clearAll = document.getElementById('fa-clear-all');
        if (clearAll) {
            clearAll.addEventListener('click', function () {
                _state = { query: '', skillIds: [], connIds: [], memory: null, scope: _initialScope };
                _panelSearch = { skills: '', conn: '' };
                _openPanel = null;
                _notifyAndRender(mountEl, null);
            });
        }

        document.addEventListener('click', function _outsideHandler(e) {
            if (_openPanel === null) return;
            var bar = document.getElementById('fa-bar');
            if (bar && !bar.contains(e.target)) {
                _panelSearch[_openPanel] = '';
                _openPanel = null;
                _render(mountEl);
                document.removeEventListener('click', _outsideHandler);
            }
        });
    }

    function _notifyAndRender(mountEl, restorePanel) {
        _render(mountEl);
        if (restorePanel && _openPanel === restorePanel) {
            var inp = document.getElementById('fa-psearch-' + restorePanel);
            if (inp) {
                inp.focus();
                _filterPanelItems(restorePanel, _panelSearch[restorePanel] || '');
            }
        }
        if (typeof _onChange === 'function') _onChange(_state);
    }

    return {
        init: function (opts) {
            var mountEl = typeof opts.mountEl === 'string'
                ? document.querySelector(opts.mountEl)
                : opts.mountEl;
            if (!mountEl) return;
            _data.skills = opts.skills || [];
            _data.connections = opts.connections || [];
            _onChange = opts.onChange || null;
            _initialScope = opts.initialScope || null;
            _state = { query: '', skillIds: [], connIds: [], memory: null, scope: _initialScope };
            _openPanel = null;
            _render(mountEl);
            return mountEl;
        },
        setData: function (skills, connections) {
            _data.skills = skills || [];
            _data.connections = connections || [];
        },
        getFilter: function () {
            return {
                query: _state.query,
                skillIds: _state.skillIds.slice(),
                connIds: _state.connIds.slice(),
                memory: _state.memory,
                scope: _state.scope,
            };
        },
        reset: function (mountEl) {
            _state = { query: '', skillIds: [], connIds: [], memory: null, scope: _initialScope };
            _panelSearch = { skills: '', conn: '' };
            _openPanel = null;
            var el = typeof mountEl === 'string' ? document.querySelector(mountEl) : mountEl;
            if (el) _render(el);
        },
    };
}());

window.FilterAgents = FilterAgents;
