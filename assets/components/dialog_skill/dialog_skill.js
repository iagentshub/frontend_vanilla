/* dialog_skill.js — IIFE DialogSkill
   API pública:
     DialogSkill.open(skill | null, onSave)
     DialogSkill.close()
*/
var DialogSkill = (function () {
    var _CATEGORY_IDS = ['ai', 'messaging', 'notes', 'productivity', 'dev', 'security', 'media', 'data', 'company'];

    var _overlay = null;
    var _onSave = null;

    function open(skill, onSave) {
        _onSave = onSave || null;
        _render(skill || null);
    }

    function close() {
        if (_overlay && _overlay.parentNode) {
            _overlay.parentNode.removeChild(_overlay);
        }
        _overlay = null;
        _onSave = null;
    }

    function _render(skill) {
        close();

        var isEdit = !!skill;
        var title = isEdit ? t('skills.dialog.title_edit') : t('skills.dialog.title_new');

        var catOptions = _CATEGORY_IDS.map(function (id) {
            var sel = (skill && skill.category === id) ? ' selected' : '';
            return '<option value="' + esc(id) + '"' + sel + '>' + esc(t('skills.categories.' + (id === 'ai' ? 'ai_agents' : (id === 'dev' ? 'dev_full' : id)))) + '</option>';
        }).join('');

        var html = [
            '<div class="dsk-overlay" id="dsk-overlay">',
            '  <div class="dsk-dialog" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">',
            '    <div class="dsk-header">',
            '      <span class="dsk-title">' + esc(title) + '</span>',
            '      <button class="dsk-close" id="dsk-close-btn" aria-label="' + t('actions.close') + '">',
            '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            '      </button>',
            '    </div>',
            '    <div class="dsk-body">',
            '      <div class="dsk-row">',
            '        <div class="dsk-field" style="flex:0 0 auto">',
            '          <label class="dsk-label" for="dsk-icon">' + t('skills.dialog.field_icon') + '</label>',
            '          <input class="dsk-input dsk-input--icon" id="dsk-icon" type="text" maxlength="4" value="' + esc((skill && skill.icon) || '🔧') + '">',
            '        </div>',
            '        <div class="dsk-field">',
            '          <label class="dsk-label" for="dsk-name">' + t('skills.dialog.field_name') + ' <span style="color:var(--danger)">*</span></label>',
            '          <input class="dsk-input" id="dsk-name" type="text" placeholder="' + t('skills.dialog.placeholder_name') + '" value="' + esc((skill && skill.name) || '') + '">',
            '        </div>',
            '      </div>',
            '      <div class="dsk-field">',
            '        <label class="dsk-label" for="dsk-desc">' + t('skills.dialog.field_description') + '</label>',
            '        <input class="dsk-input" id="dsk-desc" type="text" placeholder="' + t('skills.dialog.placeholder_desc') + '" value="' + esc((skill && skill.description) || '') + '">',
            '      </div>',
            '      <div class="dsk-field">',
            '        <label class="dsk-label" for="dsk-category">' + t('skills.dialog.field_category') + '</label>',
            '        <select class="dsk-select" id="dsk-category">',
            '          <option value="">' + t('skills.dialog.no_category') + '</option>',
            catOptions,
            '        </select>',
            '      </div>',
            '      <div class="dsk-field">',
            '        <label class="dsk-label" for="dsk-content">' + t('skills.dialog.field_content') + '</label>',
            '        <textarea class="dsk-textarea" id="dsk-content" placeholder="' + t('skills.dialog.placeholder_content') + '">' + esc((skill && skill.content) || '') + '</textarea>',
            '      </div>',
            '    </div>',
            '    <div class="dsk-footer">',
            '      <button class="dsk-btn dsk-btn--cancel" id="dsk-cancel-btn">' + t('actions.cancel') + '</button>',
            '      <button class="dsk-btn dsk-btn--save" id="dsk-save-btn">' + t('actions.save') + '</button>',
            '    </div>',
            '  </div>',
            '</div>',
        ].join('');

        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        _overlay = wrapper.firstElementChild;
        document.body.appendChild(_overlay);

        document.getElementById('dsk-close-btn').addEventListener('click', close);
        document.getElementById('dsk-cancel-btn').addEventListener('click', close);
        document.getElementById('dsk-save-btn').addEventListener('click', function () {
            _submit(skill);
        });

        setTimeout(function () {
            var nameEl = document.getElementById('dsk-name');
            if (nameEl) nameEl.focus();
        }, 50);
    }

    function _submit(existingSkill) {
        var name = (document.getElementById('dsk-name').value || '').trim();
        if (!name) {
            window.toast(t('skills.dialog.name_required'), 'error');
            document.getElementById('dsk-name').focus();
            return;
        }

        var payload = {
            name: name,
            icon: (document.getElementById('dsk-icon').value || '🔧').trim(),
            description: (document.getElementById('dsk-desc').value || '').trim(),
            category: (document.getElementById('dsk-category').value || '').trim() || null,
            content: (document.getElementById('dsk-content').value || '').trim(),
        };

        if (existingSkill && existingSkill.id) {
            payload.id = existingSkill.id;
        }

        var saveBtn = document.getElementById('dsk-save-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = t('actions.saving');

        window.api.post('/api/skills/private', payload)
            .then(function () {
                window.toast(t('skills.dialog.saved'), 'success');
                close();
                if (_onSave) _onSave();
            })
            .catch(function (err) {
                window.toast(t('skills.dialog.save_error', { message: err.message || t('skills.dialog.no_category') }), 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = t('actions.save');
            });
    }

    return { open: open, close: close };
})();
