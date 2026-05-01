// admin-users.js — gestión de usuarios (solo admin)
'use strict';

async function init() {
    await window.requireAuth();
    renderNav('nav-root', 'admin-users');
    await loadUsers();
}

async function loadUsers() {
    var wrap = document.getElementById('users-table-wrap');
    try {
        var users = await api.get('/api/admin/users');
        renderTable(users, wrap);
    } catch (e) {
        if (e.status === 403) {
            window.location.replace('/agents/');
        } else {
            wrap.innerHTML = '<div class="loading-state">' + t('admin.error_load') + '</div>';
        }
    }
}

function renderTable(users, wrap) {
    if (!users.length) {
        wrap.innerHTML = '<div class="empty-users">' + t('admin.empty') + '</div>';
        return;
    }

    var rows = users.map(function (u) {
        var initial = (u.username || '?').charAt(0).toUpperCase();
        var roleCls = u.role === 'admin' ? 'role-badge--admin' : 'role-badge--standard';
        var roleLabel = u.role === 'admin' ? t('admin.roles.admin') : t('admin.roles.standard');
        var date = u.created_at ? new Date(u.created_at).toLocaleDateString(window.i18n ? window.i18n.getLang() + '-' + window.i18n.getLang().toUpperCase() : 'es-ES') : '—';
        return '<tr>' +
            '<td><div class="user-name-cell">' +
            '<div class="user-avatar">' + esc(initial) + '</div>' +
            '<span>' + esc(u.username) + '</span>' +
            '</div></td>' +
            '<td>' + esc(u.email || '—') + '</td>' +
            '<td><span class="role-badge ' + roleCls + '">' + roleLabel + '</span></td>' +
            '<td>' + date + '</td>' +
            '<td>' +
            (u.role !== 'admin'
                ? '<button class="btn-delete" data-username="' + esc(u.username) + '">' + t('admin.delete_btn') + '</button>'
                : '—') +
            '</td>' +
            '</tr>';
    }).join('');

    wrap.innerHTML =
        '<table class="users-table">' +
        '<thead><tr>' +
        '<th>' + t('admin.table.user') + '</th><th>' + t('admin.table.email') + '</th><th>' + t('admin.table.role') + '</th><th>' + t('admin.table.created') + '</th><th></th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '</table>';

    wrap.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            var username = btn.dataset.username;
            if (!confirm(t('admin.confirm_delete', { username: username }))) return;
            try {
                await api.del('/api/admin/users/' + encodeURIComponent(username));
                toast(t('admin.deleted'), 'success');
                await loadUsers();
            } catch (e) {
                toast(e.message || t('admin.error_delete'), 'error');
            }
        });
    });
}

init();
