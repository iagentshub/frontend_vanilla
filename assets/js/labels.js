// labels.js — sistema de etiquetas semánticas compartido entre todas las páginas
'use strict';

window.LABELS = (function () {

    var GROUPS = [
        {
            id: 'visibility',
            exclusive: true,
            required: true,
            i18nKey: 'labels.group.visibility',
            defaultKey: 'private',
            labels: [
                { key: 'private', color: '#64748b', i18nKey: 'labels.private' },
                { key: 'public', color: '#059669', i18nKey: 'labels.public' },
            ],
        },
        {
            id: 'environment',
            exclusive: true,
            required: false,
            i18nKey: 'labels.group.environment',
            labels: [
                { key: 'production', color: '#0891b2', i18nKey: 'labels.production' },
                { key: 'staging', color: '#475569', i18nKey: 'labels.staging' },
                { key: 'development', color: '#d97706', i18nKey: 'labels.development' },
                { key: 'test', color: '#7c3aed', i18nKey: 'labels.test' },
            ],
        },
        {
            id: 'status',
            exclusive: true,
            required: false,
            i18nKey: 'labels.group.status',
            labels: [
                { key: 'favorite', color: '#f59e0b', i18nKey: 'labels.favorite' },
                { key: 'draft', color: '#8b5cf6', i18nKey: 'labels.draft' },
                { key: 'review', color: '#f97316', i18nKey: 'labels.review' },
                { key: 'deprecated', color: '#ca8a04', i18nKey: 'labels.deprecated' },
                { key: 'quarantine', color: '#ef4444', i18nKey: 'labels.quarantine' },
                { key: 'archived', color: '#94a3b8', i18nKey: 'labels.archived' },
                { key: 'delete', color: '#dc2626', i18nKey: 'labels.delete' },
            ],
        },
    ];

    // Index por clave
    var _byKey = {};
    GROUPS.forEach(function (g) {
        g.labels.forEach(function (l) {
            _byKey[l.key] = { group: g.id, color: l.color, i18nKey: l.i18nKey, exclusive: g.exclusive };
        });
    });

    // ── Utils ─────────────────────────────────────────────────────────────────

    function _t(key) {
        return (window.t ? window.t(key) : null) || key.split('.').pop();
    }

    function _esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getDef(key) { return _byKey[key] || null; }

    function getLabel(key) {
        var def = _byKey[key];
        return def ? _t(def.i18nKey) : key;
    }

    function getColor(key) {
        var def = _byKey[key];
        return def ? def.color : '#94a3b8';
    }

    function getGroupId(key) {
        var def = _byKey[key];
        return def ? def.group : null;
    }

    // Aplica una etiqueta respetando exclusividad
    function apply(current, key) {
        var def = _byKey[key];
        if (!def) return (current || []).slice();
        var result = (current || []).filter(function (k) {
            if (!def.exclusive) return true;
            return getGroupId(k) !== def.group;
        });
        if (result.indexOf(key) === -1) result.push(key);
        return result;
    }

    // Elimina una etiqueta (para grupos multi-selección)
    function remove(current, key) {
        return (current || []).filter(function (k) { return k !== key; });
    }

    // Clave activa de un grupo exclusivo dado el array actual
    function getActive(current, groupId) {
        var group = null;
        for (var i = 0; i < GROUPS.length; i++) {
            if (GROUPS[i].id === groupId) { group = GROUPS[i]; break; }
        }
        if (!group) return null;
        var keys = group.labels.map(function (l) { return l.key; });
        for (var j = 0; j < (current || []).length; j++) {
            if (keys.indexOf(current[j]) !== -1) return current[j];
        }
        return group.required ? (group.defaultKey || null) : null;
    }

    // ── Renderizado de chips (solo lectura) ───────────────────────────────────

    // hidePrivate=true por defecto para no mostrar ruido en las tarjetas
    function renderChips(labelKeys, opts) {
        opts = opts || {};
        var hide = opts.hide || ['private'];
        return (labelKeys || []).filter(function (k) {
            return hide.indexOf(k) === -1 && _byKey[k];
        }).map(function (key) {
            var color = getColor(key);
            var text = getLabel(key);
            return '<span class="label-chip" style="--lc:' + color + '">' + _esc(text) + '</span>';
        }).join('');
    }

    // ── Renderizado del picker (en formularios) ───────────────────────────────

    function renderPicker(current, pickerElId, opts) {
        var excludeGroups = (opts && opts.excludeGroups) || [];
        var html = '<div class="lbl-picker" id="' + pickerElId + '">';
        GROUPS.forEach(function (g) {
            if (excludeGroups.indexOf(g.id) !== -1) return;
            html += '<div class="lbl-group">';
            html += '<label class="lbl-group-title">' + _esc(_t(g.i18nKey)) + '</label>';
            if (g.exclusive) {
                var activeKey = getActive(current, g.id) || '';
                var activeLabel = g.labels.find(function (l) { return l.key === activeKey; });
                var lc = activeLabel ? activeLabel.color : 'transparent';
                html += '<div class="lbl-select-wrap" style="--lc:' + lc + '" data-lpicker="' + pickerElId + '" data-lgroup="' + g.id + '">';
                html += '<select class="lbl-select select" data-lpicker="' + pickerElId + '" data-lgroup="' + g.id + '">';
                if (!g.required) {
                    html += '<option value="">— ' + _esc(_t('labels.none') || 'Ninguno') + ' —</option>';
                }
                g.labels.forEach(function (l) {
                    html += '<option value="' + _esc(l.key) + '"' + (l.key === activeKey ? ' selected' : '') + '>' +
                        _esc(_t(l.i18nKey)) + '</option>';
                });
                html += '</select></div>';
            } else {
                html += '<div class="lbl-group-btns">';
                if (!g.required) {
                    var noneActive = !getActive(current, g.id);
                    html += '<button type="button" class="lbl-seg-btn lbl-seg-none' + (noneActive ? ' active' : '') + '"' +
                        ' data-lpicker="' + pickerElId + '" data-lgroup="' + g.id + '" data-lkey="">' +
                        _t('labels.none') + '</button>';
                }
                g.labels.forEach(function (l) {
                    var isActive = (current || []).indexOf(l.key) !== -1;
                    html += '<button type="button" class="lbl-seg-btn' + (isActive ? ' active' : '') + '"' +
                        ' style="--lc:' + l.color + '"' +
                        ' data-lpicker="' + pickerElId + '" data-lgroup="' + g.id + '" data-lkey="' + l.key + '">' +
                        _esc(_t(l.i18nKey)) + '</button>';
                });
                html += '</div>';
            }
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    function bindPicker(pickerElId, current, callback) {
        var el = document.getElementById(pickerElId);
        if (!el) return;

        // Selects (grupos exclusivos)
        el.querySelectorAll('select[data-lpicker="' + pickerElId + '"]').forEach(function (sel) {
            sel.addEventListener('change', function () {
                var group = sel.dataset.lgroup;
                var key = sel.value;
                var next = (current || []).filter(function (k) { return getGroupId(k) !== group; });
                if (key) next.push(key);
                current = next;
                var wrap = sel.closest('.lbl-select-wrap');
                if (wrap) {
                    var groupDef = GROUPS.find(function (g) { return g.id === group; });
                    var lbl = groupDef && groupDef.labels.find(function (l) { return l.key === key; });
                    wrap.style.setProperty('--lc', lbl ? lbl.color : 'transparent');
                }
                if (typeof callback === 'function') callback(current);
            });
        });

        // Botones (grupos multi-selección)
        el.addEventListener('click', function (e) {
            var btn = e.target.closest('button[data-lpicker="' + pickerElId + '"]');
            if (!btn) return;
            var key = btn.dataset.lkey;
            var group = btn.dataset.lgroup;
            var groupDef = GROUPS.find(function (g) { return g.id === group; });
            if (!groupDef) return;
            var next;
            if (!key) {
                next = (current || []).filter(function (k) { return getGroupId(k) !== group; });
            } else if (groupDef.exclusive) {
                next = apply(current, key);
            } else {
                if ((current || []).indexOf(key) !== -1) next = remove(current, key);
                else { next = (current || []).slice(); next.push(key); }
            }
            current = next;
            _updatePickerUI(el, current);
            if (typeof callback === 'function') callback(current);
        });
    }

    function _updatePickerUI(pickerEl, current) {
        pickerEl.querySelectorAll('select[data-lgroup]').forEach(function (sel) {
            var group = sel.dataset.lgroup;
            var active = getActive(current, group) || '';
            sel.value = active;
            var wrap = sel.closest('.lbl-select-wrap');
            if (wrap) {
                var groupDef = GROUPS.find(function (g) { return g.id === group; });
                var lbl = groupDef && groupDef.labels.find(function (l) { return l.key === active; });
                wrap.style.setProperty('--lc', lbl ? lbl.color : 'transparent');
            }
        });
        pickerEl.querySelectorAll('button[data-lpicker]').forEach(function (btn) {
            var key = btn.dataset.lkey;
            var group = btn.dataset.lgroup;
            var groupDef = GROUPS.find(function (g) { return g.id === group; });
            if (!groupDef) return;
            var active;
            if (!key) {
                var hasAny = (current || []).some(function (k) { return getGroupId(k) === group; });
                active = !hasAny && !groupDef.required;
            } else if (groupDef.exclusive) {
                active = getActive(current, group) === key;
            } else {
                active = (current || []).indexOf(key) !== -1;
            }
            btn.classList.toggle('active', !!active);
        });
    }
    return {
        GROUPS: GROUPS,
        /** Devuelve el array completo de grupos (para el filtro de conexiones). */
        groups: function () { return GROUPS; },
        getDef: getDef,
        getLabel: getLabel,
        getColor: getColor,
        getGroupId: getGroupId,
        getActive: getActive,
        apply: apply,
        remove: remove,
        renderChips: renderChips,
        renderPicker: renderPicker,
        bindPicker: bindPicker,
    };
}());
