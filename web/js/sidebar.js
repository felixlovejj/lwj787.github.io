// 侧边栏折叠/展开逻辑（可复用）
(function () {
    function qs(sel, root) { return (root || document).querySelector(sel) }
    function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)) }

    function initSidebar(root) {
        // root may be document or a subtree
        root = root || document;
        var wrapper = qs('#site-wrapper', root);

        // NOTE: we intentionally avoid injecting runtime CSS here.
        // All layout rules should live in `web/css/sidebar.css` to keep behavior reusable and predictable.

        // Build wrapper as early as possible (DOMContentLoaded is enough).
        // Delaying until readyState==='complete' can prevent #site-wrapper from ever existing,
        // which makes spacing rules in sidebar.css not apply.
        if (!wrapper) {
            wrapper = buildWrapper(root);
        }

        // sidebarEl is either the final #site-sidebar or the original left column (.mdui-col-md-2)
        var sidebar = qs('#site-sidebar', wrapper) || qs('.mdui-col-md-2', root);
        var content = qs('#site-content', wrapper) || qs('.mdui-col-md-10', root);
        if (!sidebar || !content) return;

        // toggle button
        // try to find an existing toggle button in document to avoid duplicates
        var btn = document.querySelector('.sidebar-toggle-btn') || (sidebar.querySelector && sidebar.querySelector('.sidebar-toggle-btn'));
        if (!btn) {
            btn = document.createElement('div');
            btn.className = 'sidebar-toggle-btn';
            btn.innerHTML = '&lt;';
            // 将按钮放在 document.body 下（fixed 定位需要脱离局部），
            // 但我们 keep 它在 DOM 中以便只创建一次并可移动位置。
            var wrapperRoot = document.body;
            wrapperRoot.appendChild(btn);
        } else {
            // if button exists elsewhere, ensure it's attached to document.body
            if (btn.parentElement !== document.body) {
                document.body.appendChild(btn);
            }
        }
        // ensure we don't accumulate multiple click handlers on re-init
        if (btn.onclick) btn.onclick = null;

        // initial visual placement (page Y=500, centered)
        btn.style.position = 'fixed';

        function getSidebarEl() {
            // Prefer the final sidebar wrapper if present and not collapsed.
            var siteSidebar = document.querySelector('#site-sidebar');
            if (siteSidebar && siteSidebar.classList && !siteSidebar.classList.contains('collapsed')) {
                return siteSidebar;
            }
            // Otherwise pick a visible left column (width check)
            var cols = [];
            try { cols = Array.from(document.querySelectorAll('.mdui-col-md-2')); } catch (e) { }
            for (var i = 0; i < cols.length; i++) {
                var c = cols[i];
                if (!c || !c.getBoundingClientRect) continue;
                var r = c.getBoundingClientRect();
                if (r.width > 20 && r.height > 20) return c;
            }
            // Fallback: collapsed sidebar still exists
            return siteSidebar || document.querySelector('.mdui-col-md-2');
        }

        function updateButtonPosition() {
            // pick the current sidebar element (might be swapped after buildWrapper)
            var currentSidebar = getSidebarEl();
            if (!currentSidebar) return;
            var rect = currentSidebar.getBoundingClientRect();
            var btnWidth = 28; // 与 CSS 保持一致
            var btnHeight = 28;
            var nudgeX = 8; // place slightly outside the left card

            // Expanded anchor: stick the button to the LEFT edge of the right card.
            // This is more stable than anchoring to the left card when the sidebar animates.
            function findVisibleRightCard() {
                var selectors = ['#right-content .rin-card', '#site-content .rin-card', '.mdui-col-md-10 .rin-card'];
                for (var i = 0; i < selectors.length; i++) {
                    var el = document.querySelector(selectors[i]);
                    if (!el || !el.getBoundingClientRect) continue;
                    var r = el.getBoundingClientRect();
                    if (r.width > 40 && r.height > 40) return el;
                }
                return null;
            }

            var rightCard = findVisibleRightCard();
            var xLeftOfRightCard = (rightCard && rightCard.getBoundingClientRect) ? rightCard.getBoundingClientRect().left : null;

            // collapsed rule: stick to the browser's left edge (keep Y unchanged)
            var isCollapsed = currentSidebar.classList && currentSidebar.classList.contains('collapsed');
            var left;
            if (isCollapsed || (rect.width < 16)) {
                left = 4;
            } else {
                // expanded: stick to left edge of right card
                if (typeof xLeftOfRightCard === 'number') {
                    left = xLeftOfRightCard - nudgeX - btnWidth / 2;
                } else {
                    // fallback: use sidebar's right edge
                    left = rect.right + nudgeX - btnWidth / 2;
                }
            }

            // clamp to viewport so the button never goes off-screen
            var vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            var minLeft = 4; // small inset
            var maxLeft = vw - btnWidth - 4;
            if (left < minLeft) left = minLeft;
            if (left > maxLeft) left = maxLeft;
            btn.style.left = left + 'px';

            // vertical: page Y=500 (button center sits at 500)
            var desiredPageY = 500;
            var vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
            var top = desiredPageY - window.scrollY - btnHeight / 2;
            var minTop = 4;
            var maxTop = Math.max(vh - btnHeight - 4, minTop);
            if (top < minTop) top = minTop;
            if (top > maxTop) top = maxTop;
            btn.style.top = top + 'px';
            // ensure CSS won't shift vertical position
            btn.style.transform = 'none';
        }

        // click handler toggles the current sidebar element (works before/after wrapper build)
        btn.onclick = function () {
            var current = getSidebarEl();
            if (!current) return;
            var isCollapsedNow = current.classList.contains('collapsed');
            current.classList.toggle('collapsed');
            var collapsed = !isCollapsedNow;
            // expose state to CSS (for padding/margin contracts)
            document.body.classList.toggle('sidebar-collapsed', collapsed);
            btn.innerHTML = collapsed ? '&gt;' : '&lt;';

            // During the CSS transition, repeatedly update button position so it follows animation
            var frames = 8;
            var i = 0;
            var tick = function () {
                updateButtonPosition();
                i++;
                if (i < frames) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);

            // Also listen for the sidebar transition end to ensure final correct placement (covers expand/collapse)
            var onTransEnd = function (e) {
                var current = getSidebarEl();
                if (e && e.target !== current) return;
                updateButtonPosition();
                if (current) current.removeEventListener('transitionend', onTransEnd);
            };
            var current = getSidebarEl();
            if (current) {
                try { current.removeEventListener('transitionend', onTransEnd); } catch (e) { }
                current.addEventListener('transitionend', onTransEnd);
            }

            // fallback: ensure final reposition after expected duration
            setTimeout(function () {
                updateButtonPosition();
                try { if (current) current.removeEventListener('transitionend', onTransEnd); } catch (e) { }
            }, 400);
        };

        // update position on init and resize/scroll
        updateButtonPosition();

        // sync initial collapsed state to body for CSS
        try {
            var initial = getSidebarEl();
            var initialCollapsed = !!(initial && initial.classList && initial.classList.contains('collapsed'));
            document.body.classList.toggle('sidebar-collapsed', initialCollapsed);
        } catch (e) { }
        window.addEventListener('resize', updateButtonPosition);
        window.addEventListener('scroll', updateButtonPosition);

        // 页面右侧控件位置（如果存在用于收起的右侧控件）
        var rightControl = qs('#right-content .page-control', root);
        if (rightControl) {
            // 添加返回按钮在右Control左上角（针对非 index 页面）
            // 优先使用 history.back()，若无可回退历史则使用 document.referrer，最后兜底到上级目录 '../'
            // 避免在 index 页或当已经存在相同按钮时重复创建
            try {
                var isIndex = /(^|\/)index\.html$/.test(location.pathname) || location.pathname === '/' || location.pathname === '';
                if (!isIndex) {
                    // avoid duplicate
                    var existingBack = document.querySelector('.page-back-btn');
                    if (!existingBack) {
                        var back = document.createElement('a');
                        back.className = 'page-back-btn';
                        back.href = 'javascript:void(0)';
                        back.innerHTML = '←';

                        back.addEventListener('click', function (e) {
                            e.preventDefault();
                            // If there is a meaningful history state, go back
                            try {
                                if (window.history && history.length > 1) {
                                    history.back();
                                    return;
                                }
                            } catch (err) { }

                            // Fallback to referrer if it's from a different origin or non-empty
                            try {
                                if (document.referrer && document.referrer !== '') {
                                    // If referrer is same origin and points to index.html or directory, navigate there
                                    // otherwise just go to referrer
                                    var ref = document.referrer;
                                    window.location.href = ref;
                                    return;
                                }
                            } catch (err) { }

                            // Final fallback: parent directory
                            try { window.location.href = '../'; } catch (err) { /* last resort: do nothing */ }
                        }, { passive: true });

                        var parent = rightControl.parentElement;
                        if (parent) parent.appendChild(back);
                    }
                }
            } catch (e) { }
        }
    }

    function buildWrapper(root) {
        var body = root || document;
        // Idempotent: if wrapper already exists, don't rebuild.
        var existing = body.getElementById ? body.getElementById('site-wrapper') : document.getElementById('site-wrapper');
        if (existing) return existing;
        var row = qs('.mdui-row', body);
        if (!row) return null;
        // 创建外层 wrapper，并把原来的 row 包裹
        var wrapper = document.createElement('div');
        wrapper.id = 'site-wrapper';
        // site-sidebar: 包含原左列
        var sidebar = document.createElement('div');
        sidebar.id = 'site-sidebar';
        var content = document.createElement('div');
        content.id = 'site-content';

        // 把 row 的两个列移动到 sidebar 和 content
        var left = row.querySelector('.mdui-col-md-2');
        var right = row.querySelector('.mdui-col-md-10');
        if (left && right) {
            // clear potential float/width styles coming from library.css so replacement doesn't produce layout jumps
            left.style.cssFloat = '';
            left.style.float = '';
            left.style.width = '';
            right.style.width = '';
            sidebar.appendChild(left);
            // if original left column was collapsed, transfer that state to the new sidebar element
            if (left.classList && left.classList.contains('collapsed')) {
                sidebar.classList.add('collapsed');
            }
            content.appendChild(right);
            wrapper.appendChild(sidebar);
            wrapper.appendChild(content);
            // replace row with wrapper
            row.parentElement.replaceChild(wrapper, row);
        }
        return wrapper;
    }

    // 自动初始化
    document.addEventListener('DOMContentLoaded', function () {
        initSidebar(document);
    });

    // NOTE: We intentionally do NOT re-init on window.load.
    // Re-initializing after load can fight with page CSS/loading order and cause visible snapping.

    // 暴露初始化函数以便手动调用
    window.__initSidebar = initSidebar;
})();
