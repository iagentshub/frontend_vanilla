// connections-modal.js — modal de crear/editar conexión (form-builder dinámico)
'use strict';

// ── Form builder ──────────────────────────────────────────────────────────────

function buildDynamicFields(type, conn) {
    var container = document.getElementById('conn-dynamic-fields');
    if (!container) return;

    var fields = Providers.fields(type);
    var isEdit = !!(conn && conn.id);

    container.innerHTML = fields.map(function (f) {
        // Saved value from backend (or empty for passwords, or default for new)
        var savedVal = conn ? (conn[f.key] != null ? String(conn[f.key]) : '') : '';
        var displayVal = f.type === 'password' ? '' : (savedVal || f.default || '');
        var hasOldPwd = f.type === 'password' && isEdit;

        var depends = '';
        if (f.depends_on) {
            depends = ' data-depends-on="' + esc(f.depends_on) +
                '" data-depends-value="' + esc(f.depends_value || '') + '"';
        }

        var hint = '';
        if (f.type === 'password' && hasOldPwd) {
            hint = '<span class="input-hint">' + t('connections.modal.api_key_hint') + '</span>';
        } else if (f.key === 'url' && f.default) {
            hint = '<span class="input-hint">' + t('connections.modal.hint_url') + '</span>';
        }

        return '<div class="field"' + depends + '>' +
            '<label>' + esc(f.label) + (f.required ? ' <span class="field-required">*</span>' : '') + '</label>' +
            _buildInput(f, displayVal) +
            hint +
            '</div>';
    }).join('');

    _bindDependsOn(container);
}

function _buildInput(f, val) {
    if (f.type === 'select') {
        var opts = (f.options || []).map(function (o) {
            return '<option value="' + esc(o.value) + '"' +
                (val === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>';
        }).join('');
        return '<select class="select" data-field-key="' + esc(f.key) + '">' + opts + '</select>';
    }

    var inputType = f.type === 'password' ? 'password'
        : f.type === 'number' ? 'number'
        : 'text';

    return '<input class="input" type="' + inputType + '"' +
        ' data-field-key="' + esc(f.key) + '"' +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') +
        (f.required ? ' required' : '') +
        ' value="' + esc(val) + '" />';
}

function _bindDependsOn(container) {
    container.querySelectorAll('[data-depends-on]').forEach(function (fieldDiv) {
        var key = fieldDiv.dataset.dependsOn;
        var expected = fieldDiv.dataset.dependsValue;
        var trigger = container.querySelector('[data-field-key="' + CSS.escape(key) + '"]');
        if (!trigger) { fieldDiv.style.display = 'none'; return; }
        function update() {
            var actual = trigger.type === 'checkbox' ? String(trigger.checked) : trigger.value;
            fieldDiv.style.display = actual === expected ? '' : 'none';
        }
        trigger.addEventListener('change', update);
        update();
    });
}

// ── Collect values from dynamic form ─────────────────────────────────────────

function collectDynamicFields() {
    var out = {};
    var container = document.getElementById('conn-dynamic-fields');
    if (!container) return out;
    container.querySelectorAll('[data-field-key]').forEach(function (el) {
        var key = el.dataset.fieldKey;
        var val = el.type === 'checkbox' ? el.checked : el.value.trim();
        if (val !== '' && val !== false && val != null) {
            out[key] = val;
        }
    });
    return out;
}

// ── Open / close ──────────────────────────────────────────────────────────────

function openModal(conn) {
    var defaultType = conn && conn.type ? conn.type : Providers.first();
    document.getElementById('conn-modal-title').textContent =
        conn ? t('connections.modal.title_edit') : t('connections.modal.title_new');
    document.getElementById('conn-id').value = conn && conn.id ? conn.id : '';
    document.getElementById('conn-name').value = conn && conn.name ? conn.name : '';
    document.getElementById('conn-type').value = defaultType;

    buildDynamicFields(defaultType, conn);

    document.getElementById('conn-modal').style.display = 'flex';
    setTimeout(function () { document.getElementById('conn-name').focus(); }, 80);
}

function closeModal() {
    document.getElementById('conn-modal').style.display = 'none';
}

// ── Provider select ───────────────────────────────────────────────────────────

function buildProviderSelect() {
    var select = document.getElementById('conn-type');
    if (!select) return;
    select.innerHTML = Providers.list().map(function (p) {
        return '<option value="' + esc(p.id) + '">' + esc(p.label) + '</option>';
    }).join('');
}
