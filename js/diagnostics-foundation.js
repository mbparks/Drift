// Drift v6.0 Foundation Cleanup: normalized core, explainability, diagnostics, and navigation consolidation.
window.DriftCore = (()=>{
 const entityArrays=['observations','evidence','stations','changes','frictions','rootCauses','interventions','interventionHistory','actions','stakeholders','interviewGuides','perspectives','codes','forecasts','assumptions','experiments','inferences','hypotheses','relationships','lessons','reviews'];
 const requiredInquiryFields=['id','title','question','createdAt','updatedAt'];
 function normalizeInquiry(i){
   entityArrays.forEach(k=>{if(!Array.isArray(i[k]))i[k]=[]});
   i.archived=Boolean(i.archived);
   i.title=i.title||'Untitled Inquiry'; i.question=i.question||'No guiding question defined.';
   i.createdAt=i.createdAt||now(); i.updatedAt=i.updatedAt||i.createdAt;
   if(typeof ensureGovernance==='function')ensureGovernance(i);
   return i;
 }
 function normalizeState(){state.inquiries=(state.inquiries||[]).map(normalizeInquiry);state.auditLog ||= [];state.backupHistory ||= [];state.savedSearches ||= [];state.version=APP_VERSION;return state}
 function records(i){return entityArrays.flatMap(type=>(i[type]||[]).map(record=>({type,record}))) }
 function scoreExplain(i){
   const metrics=[
    ['Observations',Math.min((i.observations||[]).length,2)/2*100,'Two observations establish repeatability'],
    ['Evidence',Math.min((i.evidence||[]).length,2)/2*100,'Two evidence items improve support'],
    ['Diagnosis',Math.min(((i.frictions||[]).length+(i.rootCauses||[]).length),2)/2*100,'Friction and cause records define the problem'],
    ['Human input',Math.min((i.perspectives||[]).length,2)/2*100,'Multiple perspectives reduce blind spots'],
    ['Testing',Math.min(((i.forecasts||[]).length+(i.experiments||[]).length),2)/2*100,'Forecasts or experiments make reasoning testable'],
    ['Learning',Math.min(((i.reviews||[]).length+(i.lessons||[]).length),2)/2*100,'Reviews and lessons close the loop']
   ];
   return {score:Math.round(metrics.reduce((n,x)=>n+x[1],0)/metrics.length),metrics};
 }
 function integrity(){
   const ids=new Map(),duplicates=[],broken=[],orphans=[];
   state.inquiries.forEach(i=>records(i).forEach(({type,record})=>{if(!record.id)return; if(ids.has(record.id))duplicates.push(record.id);else ids.set(record.id,{i,type,record})}));
   state.inquiries.forEach(i=>(i.relationships||[]).forEach(r=>{if(r.fromId&&!ids.has(r.fromId))broken.push({id:r.id,side:'from',target:r.fromId});if(r.toId&&!ids.has(r.toId))broken.push({id:r.id,side:'to',target:r.toId})}));
   state.inquiries.forEach(i=>(i.evidence||[]).forEach(e=>{const linked=(i.relationships||[]).some(r=>r.fromId===e.id||r.toId===e.id)||records(i).some(({record})=>record!==e&&Object.values(record).some(v=>typeof v==='string'&&v.includes(e.id)));if(!linked)orphans.push(e.id)}));
   return {ids,duplicates,broken,orphans};
 }
 return {entityArrays,requiredInquiryFields,normalizeInquiry,normalizeState,records,scoreExplain,integrity};
})();
DriftCore.normalizeState();

function scoreBreakdownHtml(i){const e=DriftCore.scoreExplain(i);return `<div class="card"><div class="section-head" style="margin:0"><div><h3>Inquiry health explainability</h3><p class="status">Health reflects coverage across observation, evidence, diagnosis, people, testing, and learning.</p></div><strong>${e.score}%</strong></div><div class="score-breakdown">${e.metrics.map(([name,value,note])=>`<div class="score-line"><div><strong>${name}</strong><br><small>${note}</small></div><div class="bar"><span style="width:${value}%"></span></div><strong>${Math.round(value)}%</strong></div>`).join('')}</div></div>`}

const v6OriginalOverview=renderOverview;
renderOverview=function(i){return v6OriginalOverview(i)+`<div style="margin-top:18px">${scoreBreakdownHtml(i)}</div>`}

function runDiagnostics(){
 const results=[];const test=(name,fn,group='Core')=>{try{const detail=fn();results.push({name,group,pass:true,detail:detail===true?'Passed':String(detail||'Passed')})}catch(e){results.push({name,group,pass:false,detail:e.message})}};
 const integrity=DriftCore.integrity();
 test('Application version',()=>APP_VERSION==='7.4.2'||(()=>{throw Error('Unexpected version '+APP_VERSION)})(),'Runtime');
 test('Overview renderer',()=>typeof renderOverview==='function'||(()=>{throw Error('renderOverview unavailable')})(),'Integration');
 test('Inquiry route integration',()=>{const r=typeof runInquiryRouteTestV741==='function'?runInquiryRouteTestV741():{pass:false,detail:'Route test unavailable'};if(!r.pass)throw Error(r.detail);return r.detail},'Integration');
 test('State serializes',()=>JSON.stringify(state).length+' bytes','Storage');
 test('Inquiry arrays normalized',()=>state.inquiries.every(i=>DriftCore.entityArrays.every(k=>Array.isArray(i[k])))||(()=>{throw Error('Missing entity arrays')})(),'Data');
 test('Unique record IDs',()=>integrity.duplicates.length?(()=>{throw Error(integrity.duplicates.length+' duplicates')})():'No duplicates','Integrity');
 test('Relationship references',()=>integrity.broken.length?(()=>{throw Error(integrity.broken.length+' broken links')})():'No broken links','Integrity');
 test('Inquiry required fields',()=>state.inquiries.every(i=>DriftCore.requiredInquiryFields.every(k=>i[k]))||(()=>{throw Error('Required inquiry fields missing')})(),'Data');
 test('Health scoring bounded',()=>state.inquiries.every(i=>{const x=DriftCore.scoreExplain(i).score;return x>=0&&x<=100})||(()=>{throw Error('Score outside 0–100')})(),'Scoring');
 test('Friction priorities numeric',()=>state.inquiries.flatMap(i=>i.frictions).every(f=>f.priority===''||f.priority==null||Number.isFinite(Number(f.priority)))||(()=>{throw Error('Invalid friction priority')})(),'Scoring');
 test('Forecast confidence bounded',()=>state.inquiries.flatMap(i=>i.forecasts).every(f=>!f.confidence||(Number(f.confidence)>=0&&Number(f.confidence)<=100))||(()=>{throw Error('Forecast confidence outside 0–100')})(),'Scoring');
 test('Governance available',()=>state.inquiries.every(i=>i.lifecycle&&i.lifecycle.status)||(()=>{throw Error('Lifecycle missing')})(),'Governance');
 return {results,integrity,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length};
}
function renderDiagnostics(){
 const d=runDiagnostics(),groups=[...new Set(d.results.map(x=>x.group))];
 diagnosticsView.innerHTML=`<div class="system-banner"><div><div class="eyebrow">Internal test harness</div><h3 style="margin:.25rem 0">Foundation diagnostics</h3><p class="status">Run repeatable checks after imports, migrations, and feature changes.</p></div><button class="btn primary" onclick="renderDiagnostics()">Run Again</button></div><div class="test-summary" style="margin-top:18px">${metric('Tests',d.results.length)}${metric('Passed',d.passed)}${metric('Failed',d.failed)}${metric('Orphan evidence',d.integrity.orphans.length)}</div>${groups.map(g=>`<div class="card" style="margin-top:18px"><h3>${g}</h3>${d.results.filter(x=>x.group===g).map(x=>`<div class="test-row"><span class="test-dot ${x.pass?'pass':'fail'}">${x.pass?'✓':'!'}</span><div><strong>${esc(x.name)}</strong><div class="status">${esc(x.detail)}</div></div><span class="badge">${x.pass?'PASS':'FAIL'}</span></div>`).join('')}</div>`).join('')}<div class="card" style="margin-top:18px"><h3>Integrity observations</h3><div class="badges"><span class="badge">${d.integrity.ids.size} indexed records</span><span class="badge">${d.integrity.broken.length} broken links</span><span class="badge">${d.integrity.duplicates.length} duplicate IDs</span><span class="badge">${d.integrity.orphans.length} orphan evidence</span></div></div>`;
}

const appRoot=document.querySelector('.app');
const sidebarToggle=document.getElementById('sidebarToggle');
const navCollapsed=localStorage.getItem('drift-nav-collapsed')==='1';if(navCollapsed)appRoot.classList.add('nav-collapsed');
sidebarToggle.onclick=()=>{appRoot.classList.toggle('nav-collapsed');localStorage.setItem('drift-nav-collapsed',appRoot.classList.contains('nav-collapsed')?'1':'0');sidebarToggle.textContent=appRoot.classList.contains('nav-collapsed')?'☰ Expand Navigation':'☰ Collapse Navigation'};
sidebarToggle.textContent=appRoot.classList.contains('nav-collapsed')?'☰ Expand Navigation':'☰ Collapse Navigation';

const v6OriginalSettings=renderSettings;
renderSettings=function(){v6OriginalSettings();settingsView.insertAdjacentHTML('afterbegin',`<div class="system-banner" style="margin-bottom:18px"><div><div class="eyebrow">v6 cleanup baseline</div><h3 style="margin:.25rem 0">Architecture, integrity, and usability</h3><p class="status">Entity normalization, health explainability, collapsible navigation, and repeatable diagnostics are active.</p></div><button class="btn" onclick="currentView='diagnostics';render()">Open Diagnostics</button></div>`)};

// Rebind navigation after the diagnostics button was added in markup.
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;render()});
audit('Application migrated','Drift v6.0 Foundation Cleanup initialized');saveState();
