// Drift v6.3.1 application bootstrap. Loaded after every feature module.
(function(){
  function start(){
    try{
      if(typeof setTheme==='function')setTheme();
      if(typeof render!=='function')throw new Error('Core renderer is unavailable.');
      render();
    }catch(error){
      console.error('Drift startup failed',error);
      const target=document.getElementById('dashboardView')||document.body;
      target.innerHTML='<div class="card"><h2>Drift could not start</h2><p class="status">'+String(error.message||error)+'</p><p>Open the browser console for technical details.</p></div>';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
