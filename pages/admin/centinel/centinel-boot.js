'use strict';
(async function () {
    await window.requireAuth({ role: 'admin' });
    renderNav('nav-root', 'admin-centinel');
    centinel.init();
}());
