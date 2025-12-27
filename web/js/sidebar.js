// 侧边栏折叠/展开逻辑（可复用）
(function(){
  function qs(sel,root){return (root||document).querySelector(sel)}
  function qsa(sel,root){return Array.from((root||document).querySelectorAll(sel))}

  function initSidebar(root){
    // root may be document or a subtree
    root = root || document;
    var wrapper = qs('#site-wrapper', root);

    // If wrapper not yet built AND page not fully loaded, avoid doing the DOM move now.
    // We'll still create/reuse the toggle button and position it relative to the existing left column
    var willBuildNow = document.readyState === 'complete';
    if(!wrapper && willBuildNow){
      wrapper = buildWrapper(root);
    }

    // sidebarEl is either the final #site-sidebar or the original left column (.mdui-col-md-2)
    var sidebar = qs('#site-sidebar', wrapper) || qs('.mdui-col-md-2', root);
    var content = qs('#site-content', wrapper) || qs('.mdui-col-md-10', root);
    if(!sidebar || !content) return;

    // toggle button
  // try to find an existing toggle button in document to avoid duplicates
  var btn = document.querySelector('.sidebar-toggle-btn') || (sidebar.querySelector && sidebar.querySelector('.sidebar-toggle-btn'));
    if(!btn){
      btn = document.createElement('div');
      btn.className='sidebar-toggle-btn';
      btn.innerHTML='&lt;';
  // 将按钮放在 document.body 下（fixed 定位需要脱离局部），
  // 但我们 keep 它在 DOM 中以便只创建一次并可移动位置。
  var wrapperRoot = document.body;
  wrapperRoot.appendChild(btn);
    } else {
      // if button exists elsewhere, ensure it's attached to document.body
      if(btn.parentElement !== document.body){
        document.body.appendChild(btn);
      }
    }
    function updateButtonPosition(){
      // 计算按钮垂直居中相对于左侧区域右边缘
  // sidebar may be the original left column before we build wrapper; still works
  var rect = sidebar.getBoundingClientRect();
      // 计算按钮位置：靠在 sidebar 的右边缘，略覆盖边界
      var x = rect.right; // 页面坐标
      var btnWidth = 28; // 与 CSS 保持一致
      var offset = 8; // 使按钮稍覆盖在边界上
      // 当折叠时，rect.width 会接近 0，此时把按钮放在原来侧栏位置（靠近左边）
  if(sidebar.classList && sidebar.classList.contains('collapsed')){
        // 当折叠，把按钮放回到原 sidebar 左边缘位置，保证可见
        btn.style.left = (rect.left + offset) + 'px';
      } else {
        btn.style.left = (x - btnWidth/2 - offset) + 'px';
      }
  // 垂直放置在左侧区域上方四分之一处
  var y = rect.top + rect.height * 0.25;
  btn.style.top = (y - btnWidth/2) + 'px';
      btn.style.position = 'fixed';
    }

    btn.addEventListener('click', function(){
      var isCollapsed = sidebar.classList.contains('collapsed');
      // toggle class to trigger CSS transition
      sidebar.classList.toggle('collapsed');
      var collapsed = !isCollapsed;
      btn.innerHTML = collapsed ? '&gt;' : '&lt;';

      // During the CSS transition, repeatedly update button position so it follows animation
      var frames = 8;
      var i = 0;
      var tick = function(){
        updateButtonPosition();
        i++;
        if(i < frames) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      // Also listen for the sidebar transition end to ensure final correct placement (covers expand/collapse)
      var onTransEnd = function(e){
        // only respond to width/padding/opacity changes on the sidebar element
        if(e && e.target !== sidebar) return;
        updateButtonPosition();
        sidebar.removeEventListener('transitionend', onTransEnd);
      };
      sidebar.addEventListener('transitionend', onTransEnd);

      // fallback: ensure final reposition after expected duration
      setTimeout(function(){
        updateButtonPosition();
        try{ sidebar.removeEventListener('transitionend', onTransEnd); }catch(e){}
      }, 400);
    });

    // update position on init and resize/scroll
    updateButtonPosition();
    window.addEventListener('resize', updateButtonPosition);
    window.addEventListener('scroll', updateButtonPosition);

  // 页面右侧控件位置（如果存在用于收起的右侧控件）
    var rightControl = qs('#right-content .page-control', root);
    if(rightControl){
      // 添加返回按钮在右Control左上角（针对非 index 页面）
      if(!location.pathname.endsWith('index.html')){
        var back = document.createElement('a');
        back.className='page-back-btn';
        back.href='../../index.html';
        back.innerHTML='←';
        // 插入到 rightControl 的父容器
        var parent = rightControl.parentElement;
        if(parent) parent.appendChild(back);
      }
    }
  }

  function buildWrapper(root){
    var body = root || document;
    var row = qs('.mdui-row', body);
    if(!row) return null;
    // 创建外层 wrapper，并把原来的 row 包裹
    var wrapper = document.createElement('div');
    wrapper.id='site-wrapper';
    // site-sidebar: 包含原左列
    var sidebar = document.createElement('div');
    sidebar.id='site-sidebar';
    var content = document.createElement('div');
    content.id='site-content';

    // 把 row 的两个列移动到 sidebar 和 content
    var left = row.querySelector('.mdui-col-md-2');
    var right = row.querySelector('.mdui-col-md-10');
    if(left && right){
  // clear potential float/width styles coming from library.css so replacement doesn't produce layout jumps
  left.style.cssFloat = '';
  left.style.float = '';
  left.style.width = '';
  right.style.width = '';
  sidebar.appendChild(left);
  content.appendChild(right);
      wrapper.appendChild(sidebar);
      wrapper.appendChild(content);
      // replace row with wrapper
      row.parentElement.replaceChild(wrapper, row);
    }
    return wrapper;
  }

  // 自动初始化
  document.addEventListener('DOMContentLoaded', function(){
    initSidebar(document);
  });

  // ensure after all resources (images) loaded we recalc final button position once more
  window.addEventListener('load', function(){
    try{
      // If wrapper hasn't been built yet (we deferred during DOMContentLoaded), build it now.
      var wrapper = document.getElementById('site-wrapper');
      if(!wrapper){
        buildWrapper(document);
      }
      // Re-init and final positioning
      if(window.__initSidebar) window.__initSidebar(document);
    }catch(e){}
    // small deferred second pass to catch late layout shifts
    setTimeout(function(){ if(window.__initSidebar) window.__initSidebar(document); }, 160);
  });

  // 暴露初始化函数以便手动调用
  window.__initSidebar = initSidebar;
})();
