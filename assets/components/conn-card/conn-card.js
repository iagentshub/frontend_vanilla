// conn-card.js — tarjetas de conexion AI
'use strict';

(function () {
    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    var TYPE_LABEL = { openai: 'OpenAI', claude: 'Claude', gemini: 'Gemini', ollama: 'Ollama' };

    window.ConnCard = {
        render: function (conn) {
            var type = (conn.type || 'openai').toLowerCase();
            var typeLabel = TYPE_LABEL[type] || type.toUpperCase();
            var sub = conn.model || conn.host || '';

            var editLabel  = window.t ? window.t('connections.actions.edit')   : 'Editar';
            var deleteTitle = window.t ? window.t('connections.actions.delete') : 'Eliminar';

            return (
                '<article class="conn-card" data-conn-id="' + esc(conn.id) + '" data-type="' + esc(type) + '">' +
                  '<div class="conn-card-body">' +
                    '<div class="conn-card-head">' +
                      '<span class="conn-card-type conn-card-type--' + esc(type) + '">' + esc(typeLabel) + '</span>' +
                    '</div>' +
                    '<h3 class="conn-card-name" title="' + esc(conn.name) + '">' + esc(conn.name) + '</h3>' +
                    (sub ? '<div class="conn-card-sub">' + esc(sub) + '</div>' : '') +
                    '<div class="conn-card-status"></div>' +
                  '</div>' +
                  '<footer class="conn-card-actions">' +
                    '<button class="card-action-btn card-action-btn--test" data-action="test-conn" data-id="' + esc(conn.id) + '">' +
                      '<svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M5 3l8 5-8 5V3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
                      'Test' +
                    '</button>' +
                    '<button class="card-action-btn card-action-btn--edit" data-action="edit-conn" data-id="' + esc(conn.id) + '">' + esc(editLabel) + '</button>' +
                    '<button class="card-action-btn card-action-btn--delete card-action-btn--icon" data-action="del-conn" data-id="' + esc(conn.id) + '" title="' + esc(deleteTitle) + '">' +
                      '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1m1 0-.4 9a1.3 1.3 0 0 1-1.3 1.2h-4A1.3 1.3 0 0 1 4 13L3.6 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' +
                    '</button>' +
                  '</footer>' +
                '</article>'
            );
        },

        renderList: function (connections, container) {
            if (!connections.length) {
                var msg = window.t ? window.t('connections.empty') : 'Sin conexiones. Anade la primera.';
                container.innerHTML = '<p style="font-size:13px;color:var(--ink-3);padding:4px 0">' + msg + '</p>';
                return;
            }
            var self = this;
            container.innerHTML = connections.map(function (c) { return self.render(c); }).join('');
        },
    };
}());
