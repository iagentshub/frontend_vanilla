// skills.js — pagina /skills
'use strict';

var _allSkills = [];

async function init() {
    await window.requireAuth();
    renderNav('nav-root', 'skills');
    FilterSkills.init({
        mountEl: '#filter-skills-root',
        onChange: _applyFilter,
    });
    await loadSkills();
    bindEvents();
}

async function loadSkills() {
    _allSkills = await api.get('/api/skills');
    _applyFilter();
}

function _applyFilter() {
    var f = FilterSkills.getFilter();
    var q = (f.query || '').toLowerCase();
    var filtered = _allSkills.filter(function (s) {
        if (f.scope && s.scope !== f.scope) return false;
        if (f.categories && f.categories.length && f.categories.indexOf(s.category || '') < 0) return false;
        if (q && s.name.toLowerCase().indexOf(q) < 0 && (s.description || '').toLowerCase().indexOf(q) < 0) return false;
        return true;
    });
    SkillCard.renderAll(filtered, document.getElementById('skills-grid'));
}

async function viewSkill(scope, id) {
    try {
        var s = await api.get('/api/skills/' + scope + '/' + encodeURIComponent(id));
        document.getElementById('skill-view-title').textContent = (s.icon ? s.icon + ' ' : '') + s.name;
        document.getElementById('skill-view-content').textContent = s.content || t('skills.no_content');
        document.getElementById('skill-view-modal').style.display = 'flex';
    } catch (e) { toast(e.message, 'error'); }
}

function bindEvents() {
    document.getElementById('btn-new-skill').addEventListener('click', function () {
        DialogSkill.open(null, loadSkills);
    });

    document.getElementById('skill-view-close').addEventListener('click', function () {
        document.getElementById('skill-view-modal').style.display = 'none';
    });
    document.getElementById('skill-view-modal').addEventListener('click', function (e) {
        if (e.target.id === 'skill-view-modal') document.getElementById('skill-view-modal').style.display = 'none';
    });

    document.getElementById('skills-grid').addEventListener('click', async function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.dataset.action;
        var id = btn.dataset.id;
        var scope = btn.dataset.scope;
        if (action === 'view-skill') {
            viewSkill(scope, id);
        } else if (action === 'edit-skill') {
            try {
                var s = await api.get('/api/skills/private/' + encodeURIComponent(id));
                DialogSkill.open(s, loadSkills);
            } catch (e) { toast(e.message, 'error'); }
        } else if (action === 'del-skill') {
            if (!confirm(t('skills.confirm_delete'))) return;
            try {
                await api.del('/api/skills/private/' + encodeURIComponent(id));
                toast(t('skills.deleted'), 'info');
                await loadSkills();
            } catch (e) { toast(e.message, 'error'); }
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        document.getElementById('skill-view-modal').style.display = 'none';
    });
}

init();
