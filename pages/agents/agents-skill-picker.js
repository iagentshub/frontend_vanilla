// agents-skill-picker.js — selector de skills + conocimiento (URLs y docs)
'use strict';

var _selectedSkillIds = [];
var _activeCat = '__all__';
var _activeTypeFilter = 'all'; // 'all' | 'skill' | 'url' | 'document'

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
        { id: '__urls__', label: t('agents.skill_picker.cat_webs') || 'Webs', icon: '🔗' },
        { id: '__docs__', label: t('agents.skill_picker.cat_docs') || 'Docs', icon: '📄' },
    ];
}

function _initSkillPicker(selected) {
    _selectedSkillIds = [...selected];
    _activeCat = '__all__';
    _activeTypeFilter = 'all';
    _renderSkillChips();
    _resetSkillSearch();
    _renderCatTabs();
    _renderSkillGrid();
}

function _renderSkillChips() {
    const cont = document.getElementById('skill-selected-chips');
    if (!cont) return;
    const know = _selectedKnowledge || [];
    if (!_selectedSkillIds.length && !know.length) { cont.innerHTML = ''; return; }

    const skillChips = _selectedSkillIds.map(sid => {
        const sk = _skills.find(s => s.id === sid);
        const label = sk ? (sk.icon ? sk.icon + ' ' : '') + sk.name : sid;
        return `<span class="skill-chip-selected">${esc(label)}<button type="button" class="skill-chip-remove" data-skill-id="${esc(sid)}">&times;</button></span>`;
    }).join('');

    const knowChips = know.map(kid => {
        const item = (_allKnowledge || []).find(k => k.id === kid);
        if (!item) return '';
        const icon = item.type === 'url' ? '🔗' : '📄';
        return `<span class="skill-chip-selected skill-chip-know">${icon} ${esc(item.title)}<button type="button" class="skill-chip-remove" data-know-id="${esc(kid)}">&times;</button></span>`;
    }).join('');

    cont.innerHTML = skillChips + knowChips;
    cont.querySelectorAll('.skill-chip-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.skillId) {
                _selectedSkillIds = _selectedSkillIds.filter(id => id !== btn.dataset.skillId);
                _renderSkillGrid();
            } else if (btn.dataset.knowId) {
                _selectedKnowledge = (_selectedKnowledge || []).filter(id => id !== btn.dataset.knowId);
                _updateKnowledgeChars();
            }
            _renderSkillChips();
            _renderSkillDropdown(document.getElementById('skill-search-input')?.value || '');
        });
    });
}

/* ── Pestaña Buscar ──────────────────────────────────────────── */

function _resetSkillSearch() {
    const input = document.getElementById('skill-search-input');
    if (input) input.value = '';
    _activeTypeFilter = 'all';
    _renderSkillDropdown('');
}

function _renderSkillDropdown(query) {
    const dropdown = document.getElementById('skill-search-dropdown');
    if (!dropdown) return;

    const q = query.trim().toLowerCase();
    if (!q) { dropdown.hidden = true; return; }

    const selKnow = _selectedKnowledge || [];
    const allKnow = _allKnowledge || [];

    // Resultados por tipo
    const skillMatches = _skills.filter(sk =>
        !_selectedSkillIds.includes(sk.id) &&
        (sk.name.toLowerCase().includes(q) || (sk.description || '').toLowerCase().includes(q))
    );
    const knowMatches = allKnow.filter(k =>
        !selKnow.includes(k.id) &&
        (k.title.toLowerCase().includes(q) || (k.source || '').toLowerCase().includes(q))
    );
    const urlMatches  = knowMatches.filter(k => k.type === 'url');
    const docMatches  = knowMatches.filter(k => k.type === 'document');

    // Aplicar filtro de tipo activo
    const visibleSkills = (_activeTypeFilter === 'url' || _activeTypeFilter === 'document') ? [] : skillMatches;
    const visibleKnow   = _activeTypeFilter === 'skill'    ? [] :
                          _activeTypeFilter === 'url'      ? urlMatches :
                          _activeTypeFilter === 'document' ? docMatches : knowMatches;

    const total = visibleSkills.length + visibleKnow.length;
    const showTypeFilter = skillMatches.length > 0 && knowMatches.length > 0;

    if (!total && !skillMatches.length && !knowMatches.length) {
        dropdown.innerHTML = `<div class="skill-dropdown-empty">${esc(t('agents.skill_picker.no_skills'))}</div>`;
        dropdown.hidden = false;
        return;
    }

    // Pills de tipo (sólo cuando hay resultados de más de una categoría)
    let filterBar = '';
    if (showTypeFilter) {
        const pills = [
            { id: 'all',      label: t('agents.skill_picker.type_all')  || 'Todos' },
            { id: 'skill',    label: t('agents.skill_picker.type_skill') || 'Skills' },
            { id: 'url',      label: '🔗 ' + (t('agents.skill_picker.type_url')  || 'Web') },
            { id: 'document', label: '📄 ' + (t('agents.skill_picker.type_doc')  || 'Docs') },
        ];
        filterBar = `<div class="ktype-filter">${pills.map(p =>
            `<button type="button" class="ktype-pill${_activeTypeFilter === p.id ? ' active' : ''}" data-type="${esc(p.id)}">${esc(p.label)}</button>`
        ).join('')}</div>`;
    }

    // Items
    const skillItems = visibleSkills.slice(0, 6).map(sk =>
        `<button type="button" class="skill-dropdown-item" data-skill-id="${esc(sk.id)}">
            <span class="sdi-icon">${sk.icon ? esc(sk.icon) : '◈'}</span>
            <span class="sdi-name">${esc(sk.name)}</span>
            <span class="sdi-type">${esc(t('agents.skill_picker.type_skill') || 'Skill')}</span>
        </button>`
    ).join('');

    const knowItems = visibleKnow.slice(0, 6).map(k =>
        `<button type="button" class="skill-dropdown-item" data-know-id="${esc(k.id)}">
            <span class="sdi-icon">${k.type === 'url' ? '🔗' : '📄'}</span>
            <span class="sdi-name">${esc(k.title)}</span>
            <span class="sdi-type">${esc(k.type === 'url' ? (t('agents.skill_picker.type_url') || 'Web') : (t('agents.skill_picker.type_doc') || 'Doc'))}</span>
        </button>`
    ).join('');

    const emptyMsg = total === 0
        ? `<div class="skill-dropdown-empty">${esc(t('agents.skill_picker.no_skills'))}</div>`
        : '';

    dropdown.innerHTML = filterBar + skillItems + knowItems + emptyMsg;
    dropdown.hidden = false;

    // Eventos pills
    dropdown.querySelectorAll('.ktype-pill').forEach(pill => {
        pill.addEventListener('click', e => {
            e.stopPropagation();
            _activeTypeFilter = pill.dataset.type;
            _renderSkillDropdown(query);
        });
    });

    // Eventos items
    dropdown.querySelectorAll('.skill-dropdown-item[data-skill-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            _selectedSkillIds.push(btn.dataset.skillId);
            document.getElementById('skill-search-input').value = '';
            _activeTypeFilter = 'all';
            dropdown.hidden = true;
            _renderSkillChips();
            _renderSkillGrid();
        });
    });
    dropdown.querySelectorAll('.skill-dropdown-item[data-know-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!_selectedKnowledge) window._selectedKnowledge = [];
            _selectedKnowledge.push(btn.dataset.knowId);
            document.getElementById('skill-search-input').value = '';
            _activeTypeFilter = 'all';
            dropdown.hidden = true;
            _renderSkillChips();
            _updateKnowledgeChars();
        });
    });
}

/* ── Pestaña Explorar ────────────────────────────────────────── */

function _renderCatTabs() {
    const tabs = document.getElementById('skill-cat-tabs');
    if (!tabs) return;

    const allKnow = _allKnowledge || [];
    const visible = _getSkillCategories().filter(cat => {
        if (cat.id === '__all__') return true;
        if (cat.id === '__none__') return _skills.some(s => !s.category);
        if (cat.id === '__urls__') return allKnow.some(k => k.type === 'url');
        if (cat.id === '__docs__') return allKnow.some(k => k.type === 'document');
        return _skills.some(s => s.category === cat.id);
    });

    tabs.innerHTML = visible.map(cat => {
        const active = _activeCat === cat.id ? ' active' : '';
        const count = cat.id === '__all__'
            ? _skills.length
            : cat.id === '__none__'
                ? _skills.filter(s => !s.category).length
                : cat.id === '__urls__'
                    ? allKnow.filter(k => k.type === 'url').length
                    : cat.id === '__docs__'
                        ? allKnow.filter(k => k.type === 'document').length
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

    const selKnow = _selectedKnowledge || [];
    const allKnow = _allKnowledge || [];

    // Knowledge-only tabs
    if (_activeCat === '__urls__' || _activeCat === '__docs__') {
        const type = _activeCat === '__urls__' ? 'url' : 'document';
        const filteredKnow = allKnow.filter(k => k.type === type && !selKnow.includes(k.id));
        if (!filteredKnow.length) {
            container.innerHTML = `<div class="skill-grid-empty">${t('agents.skill_picker.no_skills')}</div>`;
            return;
        }
        container.innerHTML = filteredKnow.map(k =>
            `<button type="button" class="skill-grid-chip skill-grid-chip-know" data-know-id="${esc(k.id)}">
                <span class="sgc-icon">${k.type === 'url' ? '🔗' : '📄'}</span>
                <span class="sgc-name">${esc(k.title)}</span>
            </button>`
        ).join('');
        container.querySelectorAll('.skill-grid-chip[data-know-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!Array.isArray(_selectedKnowledge)) window._selectedKnowledge = [];
                _selectedKnowledge.push(btn.dataset.knowId);
                _renderSkillChips();
                _updateKnowledgeChars();
                _renderSkillGrid();
            });
        });
        return;
    }

    const filteredSkills = _skills.filter(sk => {
        if (_selectedSkillIds.includes(sk.id)) return false;
        if (_activeCat === '__all__') return true;
        if (_activeCat === '__none__') return !sk.category;
        return sk.category === _activeCat;
    });

    if (!filteredSkills.length) {
        container.innerHTML = `<div class="skill-grid-empty">${t('agents.skill_picker.no_skills')}</div>`;
        return;
    }

    container.innerHTML = filteredSkills.map(sk =>
        `<button type="button" class="skill-grid-chip" data-skill-id="${esc(sk.id)}">
            ${sk.icon ? `<span class="sgc-icon">${esc(sk.icon)}</span>` : ''}
            <span class="sgc-name">${esc(sk.name)}</span>
        </button>`
    ).join('');

    container.querySelectorAll('.skill-grid-chip[data-skill-id]').forEach(btn => {
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
