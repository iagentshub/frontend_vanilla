'use strict';
(async function () {
    renderNav('nav-root', 'admin-centinel');
    await window.requireAuth({ role: 'admin' });
    centinel.init();
}());
