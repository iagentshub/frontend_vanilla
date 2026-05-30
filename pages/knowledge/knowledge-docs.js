// knowledge-docs.js — gestión de documentos en la pestaña Conocimiento
'use strict';

var KnowledgeDocs = (function () {
    var _items = [];
    var _loaded = false;
    var _activeFolderId = null;

    function init() {
        document.getElementById('doc-file-input').addEventListener('change', function (e) {
            var file = e.target.files[0];
            e.target.value = '';
            if (file) _uploadSingle(file);
        });

        var folderInput = document.getElementById('folder-file-input');
        if (folderInput) {
            folderInput.addEventListener('change', function (e) {
                var files = Array.from(e.target.files || []);
                e.target.value = '';
                if (!files.length) {
                    toast('No se detectaron archivos. Puede que el navegador no soporte la selección de carpetas.', 'error');
                    return;
                }
                _uploadFolder(files);
            });
        }

        // Drag & drop
        var dropzone = document.getElementById('docs-dropzone');
        if (dropzone) {
            dropzone.addEventListener('click', function () {
                document.getElementById('doc-file-input').click();
            });
            dropzone.addEventListener('dragover', function (e) {
                e.preventDefault();
                dropzone.classList.add('drag-over');
            });
            dropzone.addEventListener('dragleave', function () {
                dropzone.classList.remove('drag-over');
            });
            dropzone.addEventListener('drop', function (e) {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
                if (window._kDrag) return; // knowledge-card drag — ignore
                var items = e.dataTransfer.items;
                if (items && items.length) {
                    var entry = items[0].webkitGetAsEntry && items[0].webkitGetAsEntry();
                    if (entry && entry.isDirectory) {
                        _readDirEntry(entry);
                        return;
                    }
                }
                var file = e.dataTransfer.files[0];
                if (file) _uploadSingle(file);
            });
        }

        document.getElementById('docs-grid').addEventListener('click', function (e) {
            var shareBtn = e.target.closest('[data-share-id]');
            if (shareBtn) { window.shareTeams && shareTeams.open('knowledge', shareBtn.dataset.shareId, shareBtn.dataset.shareName || ''); return; }
            var delBtn = e.target.closest('[data-del-id]');
            if (delBtn) { _deleteItem(delBtn.dataset.delId); return; }
            var moveBtn = e.target.closest('[data-move-id]');
            if (moveBtn) {
                var item = _items.find(function (i) { return i.id === moveBtn.dataset.moveId; });
                FolderMoveDialog.open('document', moveBtn.dataset.moveId, item ? item.folder_id : null, function () { load(); });
                return;
            }
        });
    }

    async function load(folderId) {
        if (folderId !== undefined) _activeFolderId = folderId;
        try {
            _items = await api.get('/api/knowledge?type=document');
            _loaded = true;
        } catch (e) {
            _items = [];
        }
        _render();
        // update folder stats via parent
        if (window._folderDocs) window._folderDocs.updateStats(_items);
    }

    function _visibleItems() {
        if (!_activeFolderId) return _items;
        return _items.filter(function (i) { return i.folder_id === _activeFolderId; });
    }

    function _render() {
        var grid = document.getElementById('docs-grid');
        if (!grid) return;
        var visible = _visibleItems();
        if (!visible.length) {
            grid.innerHTML = '<p class="knowledge-empty">' + (t('skills.knowledge.empty_docs') || 'Sin documentos todavía.') + '</p>';
            return;
        }
        grid.innerHTML = visible.map(function (item) {
            var icon = item.source.toLowerCase().endsWith('.pdf') ? '📄' : '📝';
            var warn = item.char_count > 8000
                ? '<span class="knowledge-warn" title="' + esc(t('skills.knowledge.char_warning') || 'Texto largo') + '">⚠</span>'
                : '';
            var _SHARE_SVG = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="12" cy="3" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="13" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="4" cy="8" r="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 3.8L5.5 7.2M10.5 12.2L5.5 8.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
            var shareBtn = !item._shared
                ? '<button class="knowledge-action-btn knowledge-action-btn--share" data-share-id="' + esc(item.id) + '" data-share-name="' + esc(item.title) + '" title="' + esc(t('teams.teams.sharing.share_with') || 'Compartir') + '">' + _SHARE_SVG + '</button>'
                : '<span class="knowledge-shared-badge">' + esc(t('teams.teams.sharing.shared_badge') || 'Compartida') + '</span>';
            return '<div class="knowledge-card" draggable="true" data-drag-id="' + esc(item.id) + '" data-drag-section="document">' +
                '<div class="knowledge-card-header">' +
                '<span class="knowledge-card-icon">' + icon + '</span>' +
                '<span class="knowledge-card-title">' + esc(item.title) + '</span>' +
                warn +
                shareBtn +
                '<button class="knowledge-action-btn knowledge-action-btn--danger" data-del-id="' + esc(item.id) + '" title="' + esc(t('common.actions.delete') || 'Eliminar') + '"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
                '</div>' +
                '<div class="knowledge-card-source">' + esc(item.source) + '</div>' +
                '<div class="knowledge-card-meta">' + esc(_fmtChars(item.char_count)) +
                (_activeFolderId ? '' : '<button class="kf-move-inline" data-move-id="' + esc(item.id) + '" title="Mover a carpeta">→</button>') +
                '</div>' +
                '</div>';
        }).join('');
    }

    async function _upload(file, folderId) {
        var allowed = ['.txt', '.md', '.pdf'];
        var ext = file.name.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : '';
        if (!allowed.includes(ext)) return null;
        var fd = new FormData();
        fd.append('file', file);
        if (folderId) fd.append('folder_id', folderId);
        var resp = await fetch('/api/knowledge/document', {
            method: 'POST',
            body: fd,
            credentials: 'same-origin',
        });
        if (!resp.ok) {
            var err = await resp.json().catch(function () { return { detail: resp.statusText }; });
            throw new Error(err.detail || resp.statusText);
        }
        return await resp.json();
    }

    async function _uploadSingle(file) {
        var btnUpload = document.getElementById('btn-upload-doc');
        btnUpload.disabled = true;
        var span = btnUpload.querySelector('span');
        var origText = span ? span.textContent : '';
        if (span) span.textContent = t('skills.knowledge.uploading') || 'Subiendo…';
        try {
            var item = await _upload(file, _activeFolderId);
            if (!item) { toast((t('skills.knowledge.formats_hint') || 'Formatos: .txt .md .pdf'), 'error'); return; }
            _items.unshift(item);
            _loaded = true;
            _render();
            if (window._folderDocs) window._folderDocs.updateStats(_items);
            toast(item.title, 'success');
        } catch (e) {
            toast((t('skills.knowledge.upload_error') || 'Error: {{msg}}').replace('{{msg}}', e.message), 'error');
        } finally {
            btnUpload.disabled = false;
            if (span) span.textContent = origText;
        }
    }

    function _readDirEntry(dirEntry) {
        var files = [];
        var folderName = dirEntry.name;
        var reader = dirEntry.createReader();
        function readBatch() {
            reader.readEntries(function (entries) {
                if (!entries.length) {
                    _uploadFolder(files, folderName);
                    return;
                }
                var pending = entries.length;
                entries.forEach(function (entry) {
                    if (entry.isFile) {
                        entry.file(function (f) {
                            files.push(f);
                            if (!--pending) readBatch();
                        });
                    } else {
                        if (!--pending) readBatch();
                    }
                });
            });
        }
        readBatch();
    }

    function _createUploadProgress(folderName, fileNames) {
        var old = document.getElementById('kup-dialog');
        if (old) old.remove();

        var dlg = document.createElement('div');
        dlg.id = 'kup-dialog';
        dlg.className = 'kup-dialog';
        dlg.innerHTML =
            '<div class="kup-header">' +
            '<span class="kup-folder-icon">📁</span>' +
            '<span class="kup-title">' + esc(folderName) + '</span>' +
            '<span class="kup-count" id="kup-count">0 / ' + fileNames.length + '</span>' +
            '</div>' +
            '<div class="kup-list" id="kup-list">' +
            fileNames.map(function (name, i) {
                return '<div class="kup-item" id="kup-item-' + i + '">' +
                    '<span class="kup-status kup-status--pending"></span>' +
                    '<span class="kup-item-name">' + esc(name) + '</span>' +
                    '</div>';
            }).join('') +
            '</div>' +
            '<div class="kup-footer" style="display:none" id="kup-footer">' +
            '<button class="kup-close-btn" id="kup-close-btn">Cerrar</button>' +
            '</div>';

        document.body.appendChild(dlg);
        document.getElementById('kup-close-btn').addEventListener('click', function () { dlg.remove(); });

        var doneCount = 0;

        return {
            setActive: function (i) {
                var item = document.getElementById('kup-item-' + i);
                if (!item) return;
                item.querySelector('.kup-status').className = 'kup-status kup-status--uploading';
                item.classList.add('kup-item--active');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            },
            setResult: function (i, ok) {
                var item = document.getElementById('kup-item-' + i);
                if (!item) return;
                item.querySelector('.kup-status').className = 'kup-status ' + (ok ? 'kup-status--ok' : 'kup-status--fail');
                item.classList.remove('kup-item--active');
                if (ok) doneCount++;
                var el = document.getElementById('kup-count');
                if (el) el.textContent = doneCount + ' / ' + fileNames.length;
            },
            finish: function () {
                var footer = document.getElementById('kup-footer');
                if (footer) footer.style.display = '';
                if (doneCount === fileNames.length) {
                    setTimeout(function () { if (dlg.parentNode) dlg.remove(); }, 2500);
                }
            },
            dismiss: function () { if (dlg.parentNode) dlg.remove(); },
        };
    }

    async function _uploadFolder(fileList, overrideName) {
        var allowed = ['.txt', '.md', '.pdf'];
        var allFiles = Array.from(fileList);
        var files = allFiles.filter(function (f) {
            var ext = f.name.includes('.') ? '.' + f.name.split('.').pop().toLowerCase() : '';
            return allowed.includes(ext);
        });
        var skipped = allFiles.length - files.length;

        if (!files.length) {
            toast('No se encontraron documentos válidos (.txt .md .pdf) — ' + allFiles.length + ' archivos en la carpeta', 'error');
            return;
        }

        var folderName = overrideName || (files[0].webkitRelativePath || files[0].name).split('/')[0];
        var progress = _createUploadProgress(folderName, files.map(function (f) { return f.name; }));

        var btnFolder = document.getElementById('btn-upload-folder');
        var span = btnFolder.querySelector('span');
        btnFolder.disabled = true;
        if (span) span.textContent = 'Subiendo…';

        try {
            var folder = await api.post('/api/knowledge/folders', { section: 'document', name: folderName });
            var folderId = folder.id;

            var done = 0;
            var failed = [];
            for (var i = 0; i < files.length; i++) {
                progress.setActive(i);
                try {
                    var item = await _upload(files[i], folderId);
                    progress.setResult(i, true);
                    if (item) { _items.unshift(item); done++; }
                } catch (fileErr) {
                    progress.setResult(i, false);
                    failed.push(files[i].name);
                    console.warn('Error subiendo ' + files[i].name + ':', fileErr.message);
                }
            }

            _loaded = true;
            _activeFolderId = folderId;
            if (window._folderDocs) {
                window._folderDocs.load().then(function () {
                    window._folderDocs.updateStats(_items);
                });
            }
            _render();
            progress.finish();

            if (done === 0) {
                toast('No se pudo subir ningún archivo de "' + folderName + '"', 'error');
            } else if (failed.length) {
                toast(done + ' subidos, ' + failed.length + ' fallaron en "' + folderName + '"', 'error');
            } else {
                var msg = '"' + folderName + '" importada (' + done + ' docs)';
                if (skipped) msg += ' · ' + skipped + ' ignorados';
                toast(msg, 'success');
            }
        } catch (e) {
            progress.dismiss();
            toast('Error al crear carpeta: ' + e.message, 'error');
        } finally {
            btnFolder.disabled = false;
            if (span) span.textContent = 'Subir carpeta';
        }
    }


    async function _deleteItem(id) {
        if (!confirm(t('skills.knowledge.confirm_delete') || '¿Eliminar?')) return;
        try {
            await api.del('/api/knowledge/' + encodeURIComponent(id));
            _items = _items.filter(function (i) { return i.id !== id; });
            _render();
            if (window._folderDocs) window._folderDocs.updateStats(_items);
            toast(t('skills.knowledge.deleted') || 'Eliminado', 'info');
        } catch (e) { toast(e.message, 'error'); }
    }

    function _fmtChars(n) {
        if (!n) return '0 chars';
        var label = t('skills.knowledge.char_count') || '{{n}} caracteres';
        if (n >= 1000) return label.replace('{{n}}', (n / 1000).toFixed(1) + 'k');
        return label.replace('{{n}}', String(n));
    }

    function getItems() { return _items; }

    return { init: init, load: load, getItems: getItems };
})();
