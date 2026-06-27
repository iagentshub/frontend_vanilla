(function () {
    'use strict';

    // Canvas dimensions
    var CW = 320, CH = 320;
    var CX = CW / 2, CY = CH / 2;
    var R  = 130; // crop circle radius

    // Cropper state
    var _img      = null;
    var _scale    = 1;
    var _minScale = 1;
    var _offX     = 0;
    var _offY     = 0;
    var _dragActive = false;
    var _lastX    = 0;
    var _lastY    = 0;
    // Pinch state
    var _lastPinchDist = 0;

    // ── Canvas drawing ────────────────────────────────────────────────────────

    function _draw(canvas) {
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, CW, CH);

        // Dark background outside circle
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, CW, CH);

        if (_img) {
            // Clip to circle and draw image
            ctx.save();
            ctx.beginPath();
            ctx.arc(CX, CY, R, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
                _img,
                CX - _img.naturalWidth  * _scale / 2 + _offX,
                CY - _img.naturalHeight * _scale / 2 + _offY,
                _img.naturalWidth  * _scale,
                _img.naturalHeight * _scale
            );
            ctx.restore();
        }

        // Circle border
        ctx.beginPath();
        ctx.arc(CX, CY, R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function _clampOffset() {
        // Ensure the image always covers the circle (no gaps)
        var hw = _img.naturalWidth  * _scale / 2;
        var hh = _img.naturalHeight * _scale / 2;
        var maxX = hw - R;
        var maxY = hh - R;
        _offX = Math.max(-maxX, Math.min(maxX, _offX));
        _offY = Math.max(-maxY, Math.min(maxY, _offY));
    }

    // ── Image loading ─────────────────────────────────────────────────────────

    function _loadImage(file, canvas, wrap, saveBtn, selectBtn) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                _img = img;
                // Fit: image covers circle with minimum scale
                _minScale = Math.max(
                    (R * 2) / img.naturalWidth,
                    (R * 2) / img.naturalHeight
                );
                _scale = _minScale;
                _offX = 0;
                _offY = 0;
                canvas.width  = CW;
                canvas.height = CH;
                _draw(canvas);
                wrap.hidden = false;
                selectBtn.style.display = 'none';
                saveBtn.disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ── Export cropped image ──────────────────────────────────────────────────

    function _exportBlob(cb) {
        var out = document.createElement('canvas');
        out.width = out.height = 256;
        var ctx = out.getContext('2d');
        var factor = 128 / R;

        ctx.save();
        ctx.beginPath();
        ctx.arc(128, 128, 128, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
            _img,
            128 - _img.naturalWidth  * _scale * factor / 2 + _offX * factor,
            128 - _img.naturalHeight * _scale * factor / 2 + _offY * factor,
            _img.naturalWidth  * _scale * factor,
            _img.naturalHeight * _scale * factor
        );
        ctx.restore();

        out.toBlob(cb, 'image/png');
    }

    // ── Drag (mouse) ──────────────────────────────────────────────────────────

    function _onMouseDown(e, canvas) {
        _dragActive = true;
        _lastX = e.clientX;
        _lastY = e.clientY;
        canvas.style.cursor = 'grabbing';
    }

    function _onMouseMove(e, canvas) {
        if (!_dragActive || !_img) return;
        _offX += e.clientX - _lastX;
        _offY += e.clientY - _lastY;
        _lastX = e.clientX;
        _lastY = e.clientY;
        _clampOffset();
        _draw(canvas);
    }

    function _onMouseUp(canvas) {
        _dragActive = false;
        canvas.style.cursor = 'grab';
    }

    // ── Zoom (wheel) ──────────────────────────────────────────────────────────

    function _onWheel(e, canvas) {
        if (!_img) return;
        e.preventDefault();
        var delta = e.deltaY < 0 ? 1.08 : 0.93;
        _scale = Math.max(_minScale, Math.min(_minScale * 6, _scale * delta));
        _clampOffset();
        _draw(canvas);
    }

    // ── Touch (drag + pinch) ──────────────────────────────────────────────────

    function _pinchDist(touches) {
        var dx = touches[0].clientX - touches[1].clientX;
        var dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function _onTouchStart(e) {
        if (e.touches.length === 1) {
            _dragActive = true;
            _lastX = e.touches[0].clientX;
            _lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            _dragActive = false;
            _lastPinchDist = _pinchDist(e.touches);
        }
    }

    function _onTouchMove(e, canvas) {
        if (!_img) return;
        e.preventDefault();
        if (e.touches.length === 1 && _dragActive) {
            _offX += e.touches[0].clientX - _lastX;
            _offY += e.touches[0].clientY - _lastY;
            _lastX = e.touches[0].clientX;
            _lastY = e.touches[0].clientY;
            _clampOffset();
            _draw(canvas);
        } else if (e.touches.length === 2) {
            var dist = _pinchDist(e.touches);
            if (_lastPinchDist > 0) {
                var factor = dist / _lastPinchDist;
                _scale = Math.max(_minScale, Math.min(_minScale * 6, _scale * factor));
                _clampOffset();
                _draw(canvas);
            }
            _lastPinchDist = dist;
        }
    }

    function _onTouchEnd() {
        _dragActive = false;
        _lastPinchDist = 0;
    }

    // ── Current avatar preview in modal ───────────────────────────────────────

    function _renderCurrentAvatar(username) {
        var wrap = document.getElementById('avatar-crop-current');
        if (!wrap) return;
        var letter = document.getElementById('avatar-crop-current-letter');
        if (letter) letter.textContent = (username || '?').charAt(0).toUpperCase();

        var url = '/api/users/' + encodeURIComponent(username) + '/avatar';
        fetch(url, { credentials: 'include' }).then(function (r) {
            if (!r.ok || r.status === 204) return;
            var img = document.createElement('img');
            img.src = url + '?t=' + Date.now();
            img.alt = '';
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
            img.onload = function () {
                if (letter) letter.style.display = 'none';
                wrap.appendChild(img);
            };
        }).catch(function () {});
    }

    // ── Public init ───────────────────────────────────────────────────────────

    window.initAvatarCrop = function (username) {
        var modal     = document.getElementById('modal-avatar-crop');
        var canvas    = document.getElementById('avatar-crop-canvas');
        var wrap      = document.getElementById('avatar-crop-canvas-wrap');
        var fileInput = document.getElementById('avatar-file-input');
        var selectBtn = document.getElementById('avatar-crop-select-btn');
        var saveBtn   = document.getElementById('avatar-crop-save');
        var cancelBtn = document.getElementById('avatar-crop-cancel');
        var closeBtn  = document.getElementById('avatar-crop-close');
        var avatarDiv = document.getElementById('profile-avatar');

        if (!modal || !canvas) return;

        function _openModal() {
            // Reset state
            _img = null; _offX = 0; _offY = 0; _scale = 1;
            wrap.hidden = true;
            selectBtn.style.display = '';
            saveBtn.disabled = true;
            // Clear canvas
            canvas.width = CW; canvas.height = CH;
            _draw(canvas);
            // Show current avatar
            _renderCurrentAvatar(username);
            modal.style.display = '';
        }

        function _closeModal() {
            modal.style.display = 'none';
        }

        // Open on avatar click
        if (avatarDiv) avatarDiv.addEventListener('click', _openModal);

        // Close buttons
        closeBtn.addEventListener('click', _closeModal);
        cancelBtn.addEventListener('click', _closeModal);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) _closeModal();
        });

        // Select image
        selectBtn.addEventListener('click', function () { fileInput.click(); });
        fileInput.addEventListener('change', function () {
            var file = fileInput.files[0];
            if (!file) return;
            var allowed = ['image/jpeg', 'image/png', 'image/webp'];
            if (allowed.indexOf(file.type) === -1) {
                toast(t('profile.avatar.invalid_format') || 'Formato no permitido', 'error');
                fileInput.value = '';
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                toast(t('profile.avatar.too_large') || 'Máximo 2 MB', 'error');
                fileInput.value = '';
                return;
            }
            _loadImage(file, canvas, wrap, saveBtn, selectBtn);
            fileInput.value = '';
        });

        // Canvas interaction
        canvas.addEventListener('mousedown',  function (e) { _onMouseDown(e, canvas); });
        window.addEventListener('mousemove',  function (e) { _onMouseMove(e, canvas); });
        window.addEventListener('mouseup',    function ()  { _onMouseUp(canvas); });
        canvas.addEventListener('wheel',      function (e) { _onWheel(e, canvas); }, { passive: false });
        canvas.addEventListener('touchstart', function (e) { _onTouchStart(e); }, { passive: true });
        canvas.addEventListener('touchmove',  function (e) { _onTouchMove(e, canvas); }, { passive: false });
        canvas.addEventListener('touchend',   function ()  { _onTouchEnd(); });

        // Save
        saveBtn.addEventListener('click', function () {
            if (!_img) return;
            saveBtn.disabled = true;
            saveBtn.textContent = t('common.saving') || 'Guardando…';
            _exportBlob(function (blob) {
                var form = new FormData();
                form.append('avatar', blob, 'avatar.png');
                fetch('/api/auth/me/avatar', {
                    method: 'POST',
                    credentials: 'include',
                    body: form,
                }).then(function (r) { return r.json(); }).then(function (data) {
                    if (data.ok) {
                        // Update both avatar instances
                        if (typeof _setAvatarImg === 'function') _setAvatarImg(data.avatar_url);
                        _closeModal();
                        toast(t('profile.avatar.saved') || 'Foto actualizada', 'success');
                    } else {
                        toast(data.detail || t('profile.avatar.error') || 'Error al guardar', 'error');
                    }
                }).catch(function () {
                    toast(t('profile.avatar.error') || 'Error al guardar', 'error');
                }).finally(function () {
                    saveBtn.disabled = false;
                    saveBtn.textContent = t('common.actions.save') || 'Guardar';
                });
            });
        });
    };

}());
