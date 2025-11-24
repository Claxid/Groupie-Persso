// Small UI helpers: accessible mobile nav toggle
(function(){
  const nav = document.getElementById('mainNav');
  if(!nav) return;
  // On small screens add a simple toggle button
  function createToggle(){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'navToggle';
    btn.setAttribute('aria-expanded', 'true');
    btn.style.marginLeft = '8px';
    btn.style.padding = '6px 10px';
    btn.style.borderRadius = '6px';
    btn.style.border = 'none';
    btn.style.background = 'rgba(0,0,0,0.06)';
    btn.style.cursor = 'pointer';
    btn.textContent = 'Menu';
    btn.addEventListener('click', ()=>{
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      nav.style.display = expanded ? 'none' : 'flex';
    });
    return btn;
  }

  function init(){
    const width = window.innerWidth;
    if(width < 600){
      // hide nav and add toggle
      nav.style.display = 'none';
      nav.style.flexDirection = 'column';
      const parent = nav.parentElement;
      if(parent && !document.getElementById('navToggle')){
        parent.insertBefore(createToggle(), nav);
      }
    } else {
      nav.style.display = 'flex';
      nav.style.flexDirection = 'row';
      const t = document.getElementById('navToggle');
      if(t) t.remove();
    }
  }
  window.addEventListener('resize', init);
  document.addEventListener('DOMContentLoaded', init);
})();
