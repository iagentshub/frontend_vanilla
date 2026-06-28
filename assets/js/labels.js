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
                { key: 'public',  color: '#059669', i18nKey: 'labels.public'  },
            ],
        },
        {
            id: 'environment',
            exclusive: true,
            required: false,
            i18nKey: 'labels.group.environment',
            labels: [
                { key: 'production',  color: '#0891b2', i18nKey: 'labels.production'  },
                { key: 'staging',     color: '#475569', i18nKey: 'labels.staging'     },
                { key: 'development', color: '#d97706', i18nKey: 'labels.development' },
                { key: 'test',        color: '#7c3aed', i18nKey: 'labels.test'        },
            ],
        },
        {
            id: 'origin',
            exclusive: true,
            required: false,
            i18nKey: 'labels.group.origin',
            labels: [
                { key: 'fork',   color: '#6366f1', i18nKey: 'labels.fork'   },
                { key: 'linked', color: '#0ea5e9', i18nKey: 'labels.linked' },
            ],
        },
        {
            id: 'status',
            exclusive: false,
            required: false,
            i18nKey: 'labels.group.status',
            labels: [
                { key: 'favorite',    color: '#f59e0b', i18nKey: 'labels.favorite'    },
                { key: 'draft',       color: '#8b5cf6', i18nKey: 'labels.draft'       },
                { key: 'review',      color: '#f97316', i18nKey: 'labels.review'      },
                { key: 'deprecated',  color: '#ca8a04', i18nKey: 'labels.deprecated'  },
                { key: 'quarantine',  color: '#ef4444', i18nKey: 'labels.quarantine'  },
                { key: 'archived',    color: '#94a3b8', i18nKey: 'labels.archived'    },
                { key: 'delete',      color: '#dc2626', i18nKey: 'labels.delete'      },
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
            var text  = getLabel(key);
            return '<span class="label-chip" style="--lc:' + color + '">' + _esc(text) + '</span>';
        }).join('');
    }

    // ── Renderizado del picker (en formularios) ───────────────────────────────

    function renderPicker(current, pickerElId) {
        var html = '<div class="lbl-picker" id="' + pickerElId + '">';
        GROUPS.forEach(function (g) {
            html += '<div class="lbl-group">';
            html += '<span class="lbl-group-title">' + _esc(_t(g.i18nKey)) + '</span>';
            html += '<div class="lbl-group-btns">';
            if (!g.required) {
                var noneActive = !getActive(current, g.id);
                html += '<button type="button" class="lbl-seg-btn lbl-seg-none' + (noneActive ? ' active' : '') + '"' +
                    ' data-lpicker="' + pickerElId + '" data-lgroup="' + g.id + '" data-lkey="">' +
                    _t('labels.none') + '</button>';
            }
            g.labels.forEach(function (l) {
                var isActive = (current || []).indexOf(l.key) !== -1 ||
                    (g.required && getActive(current, g.id) === l.key);
                html += '<button type="button" class="lbl-seg-btn' + (isActive ? ' active' : '') + '"' +
                    ' style="--lc:' + l.color + '"' +
                    ' data-lpicker="' + pickerElId + '" data-lgroup="' + g.id + '" data-lkey="' + l.key + '">' +
                    _esc(_t(l.i18nKey)) + '</button>';
            });
            html += '</div></div>';
        });
        html += '</div>';
        return html;
    }

    // Enlaza eventos al picker renderizado. Llama callback(newLabels) al cambiar.
    function bindPicker(pickerElId, current, callback) {
        var el = document.getElementById(pickerElId);
        if (!el) return;
        el.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-lpicker="' + pickerElId + '"]');
            if (!btn) return;
            var key    = btn.dataset.lkey;
            var group  = btn.dataset.lgroup;
            var groupDef = null;
            for (var i = 0; i < GROUPS.length; i++) {
                if (GROUPS[i].id === group) { groupDef = GROUPS[i]; break; }
            }
            if (!groupDef) return;
            var next;
            if (!key) {
                // "Ninguno" — elimina todas las etiquetas del grupo
                next = (current || []).filter(function (k) { return getGroupId(k) !== group; });
            } else if (groupDef.exclusive) {
                next = apply(current, key);
            } else {
                // multi-selección: toggle
                if ((current || []).indexOf(key) !== -1) {
                    next = remove(current, key);
                } else {
                    next = (current || []).slice();
                    next.push(key);
                }
            }
            current = next;
            _updatePickerUI(el, current);
            if (typeof callback === 'function') callback(current);
        });
    }

    function _updatePickerUI(pickerEl, current) {
        pickerEl.querySelectorAll('[data-lpicker]').forEach(function (btn) {
            var key   = btn.dataset.lkey;
            var group = btn.dataset.lgroup;
            var groupDef = null;
            for (var i = 0; i < GROUPS.length; i++) {
                if (GROUPS[i].id === group) { groupDef = GROUPS[i]; break; }
            }
            if (!groupDef) return;
            var active;
            if (!key) {
                active = !getActive(current, group) && !groupDef.required;
                if (groupDef.required) active = false;
                // "Ninguno" activo si no hay ninguna etiqueta del grupo seleccionada
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
