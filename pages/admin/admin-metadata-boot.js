'use strict';
(async function () {
    renderNav('nav-root', 'admin-metadata');
    await window.requireAuth({ role: 'admin' });
    window.adminMetadata.init();
}());
