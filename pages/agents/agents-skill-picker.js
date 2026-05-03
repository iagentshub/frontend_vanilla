// agents-skill-picker.js — selector de skills con búsqueda y exploración por categoría
'use strict';

var _selectedSkillIds = [];
var _activeCat = '__all__';

function _getSkillCategories() {
    return [
        { id: '__all__', label: t('agents.skill_picker.all'), icon: '◈' },
        { id: 'ai', label: t('skills.categories.ai'), icon: '🤖' },
        { id: 'messaging', label: t('skills.categories.messaging'), icon: '🗣️' },
        { id: 'notes', label: t('skills.categories.notes'), icon: '📝' },
        { id: 'productivity', label: t('skills.categories.productivity'), icon: '✅' },
        { id: 'dev', label: t('skills.categories.dev_full'), icon: '💻' },
        { id: 'security', label: t('skills.categories.security'), icon: '🔒' },
        { id: 'media', label: t('skills.categories.media'), icon: '🎬' },
        { id: 'data', label: t('skills.categories.data'), icon: '🌐' },
        { id: 'company', label: t('skills.categories.company'), icon: '🏢' },
        { id: '__none__', label: t('agents.skill_picker.other'), icon: '📦' },
    ];
}

function _initSkillPicker(selected) {
    _selectedSkillIds = [...selected];
    _activeCat = '__all__';
    _renderSkillChips();
    _resetSkillSearch();
    _renderCatTabs();
    _renderSkillGrid();
}

function _renderSkillChips() {
    const cont = document.getElementById('skill-selected-chips');
    if (!cont) return;
    if (!_selectedSkillIds.length) { cont.innerHTML = ''; return; }
    cont.innerHTML = _selectedSkillIds.map(sid => {
        const sk = _skills.find(s => s.id === sid);
        const label = sk ? (sk.icon ? sk.icon + ' ' : '') + sk.name : sid;
        return `<span class="skill-chip-selected">${esc(label)}<button type="button" class="skill-chip-remove" data-skill-id="${esc(sid)}">&times;</button></span>`;
    }).join('');
    cont.querySelectorAll('.skill-chip-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            _selectedSkillIds = _selectedSkillIds.filter(id => id !== btn.dataset.skillId);
            _renderSkillChips();
            _renderSkillDropdown(document.getElementById('skill-search-input')?.value || '');
            _renderSkillGrid();
        });
    });
}

/* ── Pestaña Buscar ──────────────────────────────────────────── */

function _resetSkillSearch() {
    const input = document.getElementById('skill-search-input');
    if (input) input.value = '';
    _renderSkillDropdown('');
}

function _renderSkillDropdown(query) {
    const dropdown = document.getElementById('skill-search-dropdown');
    if (!dropdown) return;

    const q = query.trim().toLowerCase();
    if (!q) { dropdown.hidden = true; return; }

    const matches = _skills.filter(sk =>
        !_selectedSkillIds.includes(sk.id) &&
        (sk.name.toLowerCase().includes(q) || (sk.description || '').toLowerCase().includes(q))
    );

    if (!matches.length) {
        dropdown.innerHTML = `<div class="skill-dropdown-empty">${esc(t('agents.skill_picker.no_skills'))}</div>`;
        dropdown.hidden = false;
        return;
    }

    dropdown.innerHTML = matches.map(sk =>
        `<button type="button" class="skill-dropdown-item" data-skill-id="${esc(sk.id)}">
            ${sk.icon ? `<span class="sdi-icon">${esc(sk.icon)}</span>` : ''}
            <span class="sdi-name">${esc(sk.name)}</span>
        </button>`
    ).join('');
    dropdown.hidden = false;

    dropdown.querySelectorAll('.skill-dropdown-item').forEach(btn => {
        btn.addEventListener('click', () => {
            _selectedSkillIds.push(btn.dataset.skillId);
            document.getElementById('skill-search-input').value = '';
            dropdown.hidden = true;
            _renderSkillChips();
        });
    });
}

/* ── Pestaña Explorar ────────────────────────────────────────── */

function _renderCatTabs() {
    const tabs = document.getElementById('skill-cat-tabs');
    if (!tabs) return;

    const visible = _getSkillCategories().filter(cat => {
        if (cat.id === '__all__') return true;
        if (cat.id === '__none__') return _skills.some(s => !s.category);
        return _skills.some(s => s.category === cat.id);
    });

    tabs.innerHTML = visible.map(cat => {
        const active = _activeCat === cat.id ? ' active' : '';
        const count = cat.id === '__all__'
            ? _skills.length
            : cat.id === '__none__'
                ? _skills.filter(s => !s.category).length
                : _skills.filter(s => s.category === cat.id).length;
        return `<button type="button" class="skill-cat-tab${active}" data-cat="${esc(cat.id)}">${esc(cat.label)} <span class="sct-count">${count}</span></button>`;
    }).join('');

    tabs.querySelectorAll('.skill-cat-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            _activeCat = btn.dataset.cat;
            tabs.querySelectorAll('.skill-cat-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _renderSkillGrid();
        });
    });
}

function _renderSkillGrid() {
    const container = document.getElementById('skill-modules');
    if (!container) return;

    const filtered = _skills.filter(sk => {
        if (_selectedSkillIds.includes(sk.id)) return false;
        if (_activeCat === '__all__') return true;
        if (_activeCat === '__none__') return !sk.category;
        return sk.category === _activeCat;
    });

    if (!filtered.length) {
        container.innerHTML = `<div class="skill-grid-empty">${t('agents.skill_picker.no_skills')}</div>`;
        return;
    }

    container.innerHTML = filtered.map(sk =>
        `<button type="button" class="skill-grid-chip" data-skill-id="${esc(sk.id)}">
            ${sk.icon ? `<span class="sgc-icon">${esc(sk.icon)}</span>` : ''}
            <span class="sgc-name">${esc(sk.name)}</span>
        </button>`
    ).join('');

    container.querySelectorAll('.skill-grid-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            _selectedSkillIds.push(btn.dataset.skillId);
            _renderSkillChips();
            _renderSkillGrid();
        });
    });
}

/* ── Pestañas del picker ─────────────────────────────────────── */

function _bindSkillSearch() {
    const input = document.getElementById('skill-search-input');
    const dropdown = document.getElementById('skill-search-dropdown');
    if (!input) return;

    input.addEventListener('input', () => _renderSkillDropdown(input.value));
    input.addEventListener('focus', () => { if (input.value.trim()) _renderSkillDropdown(input.value); });

    document.addEventListener('click', e => {
        if (!input.contains(e.target) && dropdown && !dropdown.contains(e.target)) {
            dropdown.hidden = true;
        }
    });

    // Flechas de scroll de categorías
    const tabsEl = document.getElementById('skill-cat-tabs');
    document.getElementById('skill-cat-prev')?.addEventListener('click', () => {
        tabsEl.scrollBy({ left: -120, behavior: 'smooth' });
    });
    document.getElementById('skill-cat-next')?.addEventListener('click', () => {
        tabsEl.scrollBy({ left: 120, behavior: 'smooth' });
    });

    // Pestañas
    document.querySelectorAll('.spt-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.spt-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const isSearch = tab.dataset.tab === 'search';
            document.getElementById('skill-panel-search').hidden = !isSearch;
            document.getElementById('skill-panel-browse').hidden = isSearch;
            if (!isSearch) { _renderCatTabs(); _renderSkillGrid(); }
        });
    });
}

function _getSelectedSkills() {
    return [..._selectedSkillIds];
}
