// action-menu.js — panel de selección posicionado con pompas de paso dinámicas
'use strict';

var ActionMenu = (function () {
    var _el = null;

    function _close() {
        if (_el) { _el.remove(); _el = null; }
        document.removeEventListener('click', _onOutside, true);
        document.removeEventListener('keydown', _onKey);
    }

    function _onOutside(e) {
        if (_el && !_el.contains(e.target)) _close();
    }

    function _onKey(e) {
        if (e.key === 'Escape') _close();
    }

    function _renderDots(stepsEl, count) {
        stepsEl.innerHTML = '';
        for (var i = 0; i < count; i++) {
            var dot = document.createElement('span');
            dot.className = 'am-dot' + (i === 0 ? ' am-dot--active' : '');
            stepsEl.appendChild(dot);
        }
    }

    function show(anchorEl, items) {
        _close();

        var rect = anchorEl.getBoundingClientRect();
        _el = document.createElement('div');
        _el.className = 'action-menu';
        _el.style.top   = (rect.bottom + 6) + 'px';
        _el.style.right = (window.innerWidth - rect.right) + 'px';

        var cardsHtml = items.map(function (item) {
            return '<button class="am-opt" type="button">'
                + '<span class="am-opt-icon">' + item.icon + '</span>'
                + '<span class="am-opt-text">'
                +   '<span class="am-opt-label">' + esc(item.label) + '</span>'
                +   (item.sub ? '<span class="am-opt-sub">' + esc(item.sub) + '</span>' : '')
                + '</span>'
                + '</button>';
        }).join('');

        _el.innerHTML = '<div class="am-opts">' + cardsHtml + '</div>'
            + '<div class="am-steps"></div>';

        document.body.appendChild(_el);

        var stepsEl      = _el.querySelector('.am-steps');
        var defaultSteps = items[0].steps || 1;
        _renderDots(stepsEl, defaultSteps);

        var btns = _el.querySelectorAll('.am-opt');
        btns.forEach(function (btn, idx) {
            btn.addEventListener('mouseenter', function () {
                _renderDots(stepsEl, items[idx].steps || 1);
            });
            btn.addEventListener('mouseleave', function () {
                _renderDots(stepsEl, defaultSteps);
            });
            btn.addEventListener('click', function () {
                _close();
                items[idx].onClick();
            });
        });

        setTimeout(function () {
            document.addEventListener('click', _onOutside, true);
            document.addEventListener('keydown', _onKey);
        }, 0);
    }

    return { show: show, close: _close };
})();
