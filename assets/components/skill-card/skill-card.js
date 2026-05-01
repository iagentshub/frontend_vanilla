// skill-card.js — tarjetas de skill
'use strict';

(function () {
    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    var FALLBACK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

    window.SkillCard = {
        render: function (skill, scope) {
            var resolvedScope = scope || skill.scope || 'public';
            var isPrivate = resolvedScope === 'private';
            var iconHtml = skill.icon
                ? '<span style="font-size:1.05rem;line-height:1">' + esc(skill.icon) + '</span>'
                : FALLBACK_ICON;
            var descHtml = skill.description
                ? '<p class="skill-card-desc">' + esc(skill.description) + '</p>'
                : '';
            var previewText = skill.content
                ? esc(skill.content.slice(0, 160)) + (skill.content.length > 160 ? '…' : '')
                : '';
            var previewHtml = previewText
                ? '<p class="skill-card-preview">' + previewText + '</p>'
                : '';

            var scopeBadge = isPrivate
                ? '<span class="skill-card-scope-badge skill-card-scope-badge--private">' + (window.t ? window.t('skills.scope.badge_private') : 'privada') + '</span>'
                : '<span class="skill-card-scope-badge skill-card-scope-badge--public">' + (window.t ? window.t('skills.scope.badge_public') : 'pública') + '</span>';

            var catKey = skill.category;
            var catLabel = catKey ? (window.t ? window.t('skills.categories.' + catKey) : catKey) : '';
            var categoryBadge = catLabel
                ? '<span class="skill-card-category-badge">' + esc(catLabel) + '</span>'
                : '';

            var editBtn = isPrivate
                ? '<button class="card-action-btn card-action-btn--edit" data-action="edit-skill" data-id="' + esc(skill.id) + '" data-scope="' + resolvedScope + '">' + (window.t ? window.t('skills.actions.edit') : 'Editar') + '</button>'
                : '';
            var deleteBtn = isPrivate
                ? '<button class="card-action-btn card-action-btn--delete" data-action="del-skill" data-id="' + esc(skill.id) + '" data-scope="' + resolvedScope + '">' + (window.t ? window.t('skills.actions.delete') : 'Eliminar') + '</button>'
                : '';

            return (
                '<article class="skill-card" data-id="' + esc(skill.id) + '" data-scope="' + resolvedScope + '">' +
                '<div class="skill-card-body">' +
                '<header class="skill-card-head">' +
                '<div class="skill-card-icon">' + iconHtml + '</div>' +
                '<div class="skill-card-meta">' +
                '<div class="skill-card-name">' + esc(skill.name) + scopeBadge + '</div>' +
                '<div class="skill-card-badges">' +
                '<code class="skill-card-id">' + esc(skill.id) + '</code>' +
                categoryBadge +
                '</div>' +
                '</div>' +
                '</header>' +
                descHtml +
                previewHtml +
                '</div>' +
                '<footer class="skill-card-actions">' +
                '<button class="card-action-btn card-action-btn--view" data-action="view-skill" data-id="' + esc(skill.id) + '" data-scope="' + resolvedScope + '">' + (window.t ? window.t('skills.actions.view') : 'Ver') + '</button>' +
                editBtn +
                deleteBtn +
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

        renderAll: function (skills, container) {
            if (!skills.length) {
                var msg = window.t ? window.t('skills.empty.no_match') : 'No hay skills que coincidan.';
                container.innerHTML = '<p class="skills-empty">' + msg + '</p>';
                return;
            }
            container.innerHTML = skills.map(function (s) {
                return SkillCard.render(s, s.scope);
            }).join('');
        },
    };
}());
