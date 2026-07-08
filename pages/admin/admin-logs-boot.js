'use strict';
(async function () {
    renderNav('nav-root', 'admin-logs');
    await window.requireAuth({ role: 'admin' });
    adminLogs.init();
}());
