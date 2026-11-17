/* 果冻弹性：按下压扁，松手回弹。will-change 只在动画期间开启，并先取消叠加的动画 */
(function () {
    var el = null;
    var sq = 'scale(1.07, 0.88)';

    function isReducedMotion() {
        return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    document.addEventListener('pointerdown', function (e) {
        var t = e.target && e.target.closest ? e.target.closest('.jelly') : null;
        if (!t || isReducedMotion()) return;
        if (typeof t.getAnimations === 'function') {
            t.getAnimations().forEach(function (a) { a.cancel(); });
        }
        el = t;
        t.style.willChange = 'transform';
        t.style.transition = 'transform .12s ease-out';
        t.style.transform = sq;
    });

    function up() {
        if (!el) return;
        var t = el;
        el = null;
        t.style.transition = '';
        t.style.transform = '';
        if (typeof t.animate !== 'function') {
            t.style.willChange = '';
            return;
        }
        var a = t.animate(
            [
                { transform: sq },
                { transform: 'scale(.93, 1.12)' },
                { transform: 'scale(1.04, .96)' },
                { transform: 'scale(.99, 1.02)' },
                { transform: 'scale(1)' }
            ],
            { duration: 680, easing: 'cubic-bezier(.3, .7, .4, 1)' }
        );
        var done = function () { t.style.willChange = ''; };
        a.onfinish = done;
        a.oncancel = done;
    }

    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
})();
