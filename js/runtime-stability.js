// Drift v7.4.2 Integration & Runtime Stability
(function(){
  const originalRender=window.render;
  const originalOpenInquiry=window.openInquiry;

  function workspaceFor(view){
    return document.getElementById(view==='inquiry'?'inquiryWorkspace':view+'View');
  }
  function showRuntimeFailure(error, view){
    console.error('Drift runtime failure', error);
    const target=workspaceFor(view)||document.getElementById('dashboardView')||document.querySelector('.content')||document.body;
    if(target){
      target.classList.add('active');
      target.innerHTML=`<div class="runtime-failure card"><div class="eyebrow">Runtime recovery</div><h2>${view==='inquiry'?'Inquiry workspace':'Workspace'} failed to load</h2><p>${esc(error&&error.message?error.message:String(error))}</p><div class="badges"><span class="badge">View: ${esc(view||'unknown')}</span><span class="badge">Version: ${esc(typeof APP_VERSION==='string'?APP_VERSION:'unknown')}</span></div><div class="toolbar" style="margin-top:16px"><button class="btn primary" onclick="currentView='dashboard';safeRenderV741()">Return to Dashboard</button><button class="btn" onclick="currentView='diagnostics';safeRenderV741()">Open Diagnostics</button><button class="btn" onclick="location.reload()">Reload Drift</button></div></div>`;
    }
    const status=document.getElementById('saveStatus');
    if(status)status.textContent='A workspace error was caught. Your saved data was not deleted.';
  }

  window.safeRenderV741=function(){
    try{return originalRender()}
    catch(error){showRuntimeFailure(error,window.currentView||currentView);return false}
  };
  window.render=window.safeRenderV741;

  window.openInquiry=function(id){
    try{
      const inquiry=(state.inquiries||[]).find(x=>String(x.id)===String(id));
      if(!inquiry)throw new Error('The selected inquiry could not be found.');
      currentInquiryId=inquiry.id;
      currentView='inquiry';
      currentTab='overview';
      if(typeof currentWorkflowStageV61!=='undefined')currentWorkflowStageV61='overview';
      return window.safeRenderV741();
    }catch(error){showRuntimeFailure(error,'inquiry');return false}
  };

  window.runInquiryRouteTestV741=function(){
    const inquiry=(state.inquiries||[])[0];
    const result={name:'Open Inquiry route',pass:true,detail:'No inquiries available; route function is registered.'};
    if(typeof window.openInquiry!=='function')return {name:result.name,pass:false,detail:'openInquiry is unavailable.'};
    if(typeof window.renderOverview!=='function')return {name:result.name,pass:false,detail:'renderOverview is unavailable.'};
    if(typeof window.renderInquiry!=='function')return {name:result.name,pass:false,detail:'renderInquiry is unavailable.'};
    if(typeof window.inquiryRecords!=='function')return {name:result.name,pass:false,detail:'Core inquiry record aggregation is unavailable.'};
    if(typeof window.inspectRecordV62!=='function')return {name:result.name,pass:false,detail:'Record inspector navigation is unavailable.'};
    if(!inquiry)return result;
    const previous={view:currentView,id:currentInquiryId,tab:currentTab,stage:typeof currentWorkflowStageV61==='undefined'?undefined:currentWorkflowStageV61};
    const target=document.getElementById('inquiryWorkspace');
    const oldHtml=target?target.innerHTML:'';
    try{
      currentInquiryId=inquiry.id;currentView='inquiry';currentTab='overview';
      if(typeof currentWorkflowStageV61!=='undefined')currentWorkflowStageV61='overview';
      renderInquiry();
      const text=(target&&target.textContent||'').trim();
      if(!text||!text.includes(inquiry.title))throw new Error('Inquiry workspace rendered no recognizable content.');
      result.detail='Inquiry overview rendered successfully for “'+inquiry.title+'”.';
    }catch(error){result.pass=false;result.detail=error.message||String(error)}
    finally{
      currentView=previous.view;currentInquiryId=previous.id;currentTab=previous.tab;
      if(typeof currentWorkflowStageV61!=='undefined'&&previous.stage!==undefined)currentWorkflowStageV61=previous.stage;
      if(target)target.innerHTML=oldHtml;
    }
    return result;
  };

  window.addEventListener('error',event=>{
    if(event&&event.error)showRuntimeFailure(event.error,typeof currentView==='string'?currentView:'dashboard');
  });
  window.addEventListener('unhandledrejection',event=>{
    showRuntimeFailure(event.reason instanceof Error?event.reason:new Error(String(event.reason)),typeof currentView==='string'?currentView:'dashboard');
  });

  // Preserve a reference for diagnostics and compatibility.
  window.DriftRuntimeV741={showRuntimeFailure,originalOpenInquiry,originalRender};
})();
