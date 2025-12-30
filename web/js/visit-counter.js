// Simple per-page PV display with +50 offset (static site)
// Depends on Busuanzi writing into the hidden span we provide.
// Usage:
//   <div class="site-visit" data-counter-key="home">
//     ... <span class="site-visit-value">加载中...</span>
//     <span class="busuanzi_value_page_pv" style="display:none"></span>
//   </div>
//   <script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
//   <script src=".../visit-counter.js"></script>
(function () {
    function toInt(v) {
        var n = parseInt(String(v || '').replace(/[^0-9]/g, ''), 10);
        return isNaN(n) ? null : n;
    }

    function updateAll() {
        var blocks = document.querySelectorAll('.site-visit[data-counter-key]');
        if (!blocks || blocks.length === 0) return false;

        var anyUpdated = false;

        for (var i = 0; i < blocks.length; i++) {
            var el = blocks[i];
            var key = el.getAttribute('data-counter-key') || '';
            var rawEl = el.querySelector('.site-visit-raw');
            var outEl = el.querySelector('.site-visit-value');
            if (!rawEl || !outEl) continue;

            // busuanzi will eventually write number into rawEl
            var raw = toInt(rawEl.textContent);
            if (raw === null) continue;

            // Basic separation:
            // - We rely on the fact that each page only has ONE block.
            // - So raw PV is per-page PV from busuanzi.
            // If you later render multiple counters on one page, you'd need different busuanzi selectors.
            var shown = raw + 50;
            outEl.textContent = String(shown);
            anyUpdated = true;

            // Optional: keep raw visible in DOM for debugging
            // outEl.title = 'raw=' + raw + ' key=' + key;
        }

        return anyUpdated;
    }

    function start() {
        // Try a bunch of times because busuanzi is async and sometimes slow.
        var tries = 0;
        var maxTries = 120; // ~30s if 250ms
        var timer = setInterval(function () {
            tries++;
            var ok = false;
            try { ok = updateAll(); } catch (e) { }
            if (ok) {
                clearInterval(timer);
                return;
            }

            // If busuanzi still didn't populate, keep “加载中...”.
            if (tries >= maxTries) {
                clearInterval(timer);
            }
        }, 250);

        // also try once on load
        try { updateAll(); } catch (e) { }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
