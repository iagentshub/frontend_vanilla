// skill-card.js — tarjetas de skill
'use strict';

(function () {
    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    var FALLBACK_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

    var SHARE_SVG  = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
        '<circle cx="12" cy="3" r="1.5" stroke="currentColor" stroke-width="1.4"/>' +
        '<circle cx="12" cy="13" r="1.5" stroke="currentColor" stroke-width="1.4"/>' +
        '<circle cx="4" cy="8" r="1.5" stroke="currentColor" stroke-width="1.4"/>' +
        '<path d="M10.5 3.8L5.5 7.2M10.5 12.2L5.5 8.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
        '</svg>';
    var EDIT_SVG   = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    var EXPORT_SVG = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    var TRASH_SVG  = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var FOLDER_SVG = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1.5 13V4a1 1 0 0 1 1-1h3.5l1.5-2H13a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

    window.SkillCard = {
        render: function (skill, scope, opts) {
            var resolvedScope = scope || skill.scope || 'public';
            var isPrivate = resolvedScope === 'private';
            var isShared = !!skill._shared;

            var iconHtml = skill.icon
                ? '<span style="font-size:1.1rem;line-height:1">' + esc(skill.icon) + '</span>'
                : FALLBACK_ICON;

            // Scope badge — only shown when noteworthy (not private default)
            var scopeBadge = '';
            if (isPrivate && isShared) {
                scopeBadge = '<span class="skill-scope-badge skill-scope-badge--shared">' +
                    (window.t ? window.t('skills.scope.badge_shared') : 'compartida') + '</span>';
            } else if (!isPrivate) {
                scopeBadge = '<span class="skill-scope-badge skill-scope-badge--public">' +
                    (window.t ? window.t('skills.scope.badge_public') : 'pública') + '</span>';
            } else {
                // private — show a subtle badge so user knows it's theirs
                scopeBadge = '<span class="skill-scope-badge skill-scope-badge--private">' +
                    (window.t ? window.t('skills.scope.badge_private') : 'privada') + '</span>';
            }

            var catKey = skill.category;
            var catLabel = catKey ? (window.t ? window.t('skills.categories.' + catKey) : catKey) : '';
            var categoryBadge = catLabel
                ? '<span class="skill-category-badge">' + esc(catLabel) + '</span>'
                : '';

            var descHtml = skill.description
                ? '<p class="skill-card-desc">' + esc(skill.description) + '</p>'
                : '<p class="skill-card-desc skill-card-desc--empty">' +
                  (window.t ? window.t('skills.card.no_description') : 'Sin descripción') + '</p>';

            // Only owner sees edit/delete/share (private, not received-as-shared)
            var canEdit = isPrivate && !isShared;
            var editBtn = canEdit
                ? '<button class="skill-action-icon" data-action="edit-skill" data-id="' + esc(skill.id) + '" data-scope="' + resolvedScope + '" title="' + (window.t ? window.t('skills.actions.edit') : 'Editar') + '">' + EDIT_SVG + '</button>'
                : '';
            var shareBtn = canEdit
                ? '<button class="skill-action-icon skill-action-icon--share" data-action="share-skill" data-id="' + esc(skill.id) + '" data-name="' + esc(skill.name) + '" title="' + (window.t ? window.t('skills.actions.share') : 'Compartir') + '">' + SHARE_SVG + '</button>'
                : '';
            var moveBtn = (opts && opts.showMove && canEdit)
                ? '<button class="skill-action-icon" data-move-id="' + esc(skill.id) + '" title="Mover a carpeta">' + FOLDER_SVG + '</button>'
                : '';
            var exportBtn = isPrivate && !isShared
                ? '<button class="skill-action-icon" data-action="export-skill" data-id="' + esc(skill.id) + '" data-scope="' + resolvedScope + '" data-name="' + esc(skill.name) + '" title="' + (window.t ? window.t('skills.actions.export') : 'Exportar') + '">' + EXPORT_SVG + '</button>'
                : '';
            var deleteBtn = canEdit
                ? '<button class="skill-action-icon skill-action-icon--danger" data-action="del-skill" data-id="' + esc(skill.id) + '" data-scope="' + resolvedScope + '" title="' + (window.t ? window.t('skills.actions.delete') : 'Eliminar') + '">' + TRASH_SVG + '</button>'
                : '';

            var dragAttrs = canEdit
                ? ' draggable="true" data-drag-id="' + esc(skill.id) + '" data-drag-section="skill"'
                : '';

            return (
                '<article class="skill-card"' + dragAttrs + ' data-id="' + esc(skill.id) + '" data-scope="' + resolvedScope + '">' +
                '<div class="skill-card-body">' +
                '<div class="skill-card-top">' +
                '<div class="skill-card-icon">' + iconHtml + '</div>' +
                '<div class="skill-card-meta">' +
                '<div class="skill-card-name-row">' +
                '<span class="skill-card-name" title="' + esc(skill.name) + '">' + esc(skill.name) + '</span>' +
                scopeBadge +
                '</div>' +
                (categoryBadge ? '<div class="skill-card-sub">' + categoryBadge + '</div>' : '') +
                '</div>' +
                '</div>' +
                descHtml +
                '</div>' +
                '<footer class="skill-card-footer">' +
                editBtn +
                '<div class="skill-card-actions-right">' +
                shareBtn +
                moveBtn +
                exportBtn +
                deleteBtn +
                '</div>' +
                '</footer>' +
                '</article>'
            );
        },

        renderTab: function (skills, scope, container) {
            if (!skills.length) {
                var key = scope === 'public' ? 'skills.empty.public' : 'skills.empty.private';
                var msg = window.t ? window.t(key) : (scope === 'public' ? 'No hay skills publicas.' : 'Sin skills privadas todavia.');
                container.innerHTML = '<p class="skills-empty">' + msg + '</p>';
                return;
            }
            container.innerHTML = skills.map(function (s) {
                return SkillCard.render(s, scope);
            }).join('');
        },

        renderAll: function (skills, container, opts) {
            if (!skills.length) {
                var msg = window.t ? window.t('skills.empty.no_match') : 'No hay skills que coincidan.';
                container.innerHTML = '<p class="skills-empty">' + msg + '</p>';
                return;
            }
            container.innerHTML = skills.map(function (s) {
                return SkillCard.render(s, s.scope, opts);
            }).join('');
        },
    };
}());
