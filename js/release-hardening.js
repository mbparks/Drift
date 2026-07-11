// Drift v6.5.0 Release Hardening
(function(){
'use strict';
const RECOVERY_KEY='drift-fi078-recovery-v65';
const RECOVERY_LIMIT=5;
const hardening={lastSnapshotAt:0,lastRegression:null,recoveryError:null};
window.DriftHardening=hardening;

function announce(message){
 const live=document.getElementById('driftLiveRegion');if(live){live.textContent='';setTimeout(()=>live.textContent=message,20)}
}
function toast(message,type='info'){
 document.querySelectorAll('.toast').forEach(x=>x.remove());
 const el=document.createElement('div');el.className='toast'+(type==='error'?' error':'');el.setAttribute('role',type==='error'?'alert':'status');el.textContent=message;document.body.appendChild(el);announce(message);setTimeout(()=>el.remove(),3600);
}
window.driftToastV65=toast;
function cloneJson(v){return JSON.parse(JSON.stringify(v))}
function recoveryList(){try{const x=JSON.parse(localStorage.getItem(RECOVERY_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return []}}
function writeRecovery(reason='Automatic recovery point',force=false){
 try{
  const t=Date.now();if(!force&&t-hardening.lastSnapshotAt<5*60*1000)return false;
  const snapshots=recoveryList();snapshots.unshift({id:uid(),createdAt:now(),reason,version:APP_VERSION,state:cloneJson(state)});
  localStorage.setItem(RECOVERY_KEY,JSON.stringify(snapshots.slice(0,RECOVERY_LIMIT)));hardening.lastSnapshotAt=t;return true;
 }catch(error){hardening.recoveryError=error.message;return false}
}
window.createRecoverySnapshotV65=()=>{const ok=writeRecovery('Manual recovery point',true);toast(ok?'Recovery point created.':'Recovery point could not be created.',ok?'info':'error');renderSettings()};
window.restoreRecoveryV65=id=>{
 const snap=recoveryList().find(x=>x.id===id);if(!snap)return toast('Recovery point was not found.','error');
 if(!confirm('Replace current Drift data with this recovery point? A safety snapshot will be created first.'))return;
 writeRecovery('Before recovery restore',true);state={...blankState(),...cloneJson(snap.state),version:APP_VERSION};if(window.DriftCore)DriftCore.normalizeState();if(typeof flushStateV64==='function')flushStateV64();else priorSave();setTheme();render();toast('Recovery point restored.');
};
window.deleteRecoveryV65=id=>{localStorage.setItem(RECOVERY_KEY,JSON.stringify(recoveryList().filter(x=>x.id!==id)));renderSettings()};

// Save wrappers preserve the v6.4 debounced persistence layer while adding periodic snapshots.
const priorSave=window.saveState;
window.saveState=function(){writeRecovery('Automatic recovery point');return priorSave.apply(this,arguments)};

function validateImportedState(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('The selected file does not contain a Drift data object.');
 if(data.inquiries!=null&&!Array.isArray(data.inquiries))throw new Error('The inquiries field must be an array.');
 const copy={...blankState(),...cloneJson(data),version:APP_VERSION};copy.inquiries=copy.inquiries||[];
 copy.inquiries.forEach((i,n)=>{if(!i||typeof i!=='object')throw new Error(`Inquiry ${n+1} is invalid.`);if(!i.id)i.id=uid();if(!i.title)i.title='Recovered inquiry';if(!i.question)i.question='Guiding question was missing during import.'});
 return copy;
}
if(window.importFile){
 importFile.onchange=async e=>{try{
  const file=e.target.files&&e.target.files[0];if(!file)return;if(file.size>50*1024*1024&&!confirm('This backup is larger than 50 MB. Continue importing?'))return;
  const parsed=JSON.parse(await file.text());const validated=validateImportedState(parsed);writeRecovery('Before import',true);state=validated;if(window.DriftCore)DriftCore.normalizeState();if(typeof flushStateV64==='function')flushStateV64();else priorSave();setTheme();render();toast(`Imported ${state.inquiries.length} inquiries successfully.`);
 }catch(error){toast('Import failed: '+error.message,'error')}finally{e.target.value=''}};
}

function addInputValidation(){
 document.querySelectorAll('input[required],textarea[required],select[required]').forEach(el=>{
  const validate=()=>{const bad=!String(el.value||'').trim();el.setAttribute('aria-invalid',bad?'true':'false');let msg=el.parentElement.querySelector('.field-error');if(bad&&!msg){msg=document.createElement('span');msg.className='field-error';msg.textContent='This field is required.';el.parentElement.appendChild(msg)}else if(!bad&&msg)msg.remove()};
  if(!el.dataset.v65Validation){el.dataset.v65Validation='1';el.addEventListener('blur',validate);el.addEventListener('input',()=>{if(el.getAttribute('aria-invalid')==='true')validate()})}
 });
}
function labelInteractiveElements(){
 document.querySelectorAll('button').forEach(btn=>{if(!btn.getAttribute('type')&&!btn.closest('form'))btn.setAttribute('type','button');if(!btn.getAttribute('aria-label')&&!btn.textContent.trim())btn.setAttribute('aria-label','Action')});
 document.querySelectorAll('.workspace').forEach(x=>x.setAttribute('aria-live','polite'));
 document.querySelectorAll('.nav button').forEach(b=>b.setAttribute('aria-current',b.classList.contains('active')?'page':'false'));
 document.querySelectorAll('img:not([alt])').forEach(img=>img.alt='');
 document.querySelectorAll('dialog').forEach(d=>{d.setAttribute('aria-modal','true');if(!d.getAttribute('aria-labelledby')){const h=d.querySelector('h1,h2,h3');if(h){h.id=h.id||d.id+'TitleA11y';d.setAttribute('aria-labelledby',h.id)}}});
 addInputValidation();
}
const observer=new MutationObserver(()=>labelInteractiveElements());observer.observe(document.documentElement,{subtree:true,childList:true});

function openSearchShortcut(){currentView='search';render();setTimeout(()=>{const q=document.querySelector('#searchView input[type="search"],#searchView input');q?.focus()},30)}
document.addEventListener('keydown',e=>{
 const tag=(e.target.tagName||'').toLowerCase(),typing=['input','textarea','select'].includes(tag)||e.target.isContentEditable;
 if(e.key==='Escape'){
  const open=[...document.querySelectorAll('dialog[open]')].pop();if(open){open.close();e.preventDefault();return}
  if(typeof closeInspectorV62==='function'&&document.body.classList.contains('inspector-open')){closeInspectorV62();e.preventDefault();return}
 }
 if(typing)return;
 if(e.key==='/'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();openSearchShortcut()}
 if((e.key==='n'||e.key==='N')&&!e.metaKey&&!e.ctrlKey){e.preventDefault();openInquiryDialog()}
 if((e.key==='q'||e.key==='Q')&&!e.metaKey&&!e.ctrlKey){e.preventDefault();quickCaptureBtn.click()}
 if(e.key==='?'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();currentView='settings';render();setTimeout(()=>document.getElementById('keyboardHelpV65')?.scrollIntoView({behavior:'smooth'}),30)}
});

function regressionTests(){
 const tests=[],run=(name,group,fn)=>{const start=performance.now();try{const detail=fn();tests.push({name,group,pass:true,detail:String(detail??'Passed'),ms:performance.now()-start})}catch(error){tests.push({name,group,pass:false,detail:error.message,ms:performance.now()-start})}};
 run('State JSON round trip','Backup',()=>{const x=JSON.parse(JSON.stringify(state));if((x.inquiries||[]).length!==state.inquiries.length)throw Error('Inquiry count changed');return `${x.inquiries.length} inquiries preserved`});
 run('Import schema guard','Backup',()=>{let rejected=false;try{validateImportedState({inquiries:{bad:true}})}catch{rejected=true}if(!rejected)throw Error('Malformed inquiry collection was accepted');return 'Malformed data rejected'});
 run('Recovery storage writable','Recovery',()=>{if(!writeRecovery('Regression test',true))throw Error(hardening.recoveryError||'Snapshot failed');return `${recoveryList().length} recovery points available`});
 run('Entity IDs unique','Integrity',()=>{const d=DriftCore.integrity();if(d.duplicates.length)throw Error(`${d.duplicates.length} duplicate IDs`);return `${d.ids.size} unique record IDs`});
 run('Relationships valid','Integrity',()=>{const d=DriftCore.integrity();if(d.broken.length)throw Error(`${d.broken.length} broken relationships`);return 'All relationship endpoints resolve'});
 run('Required workspace targets','UI',()=>{const views=['dashboard','inquiries','fieldwork','evidence','stations','patterns','control','search','templates','reports','archive','settings','diagnostics'];const missing=views.filter(x=>!document.getElementById(x+'View'));if(missing.length)throw Error('Missing: '+missing.join(', '));return `${views.length} workspaces present`});
 run('Dialogs labeled','Accessibility',()=>{labelInteractiveElements();const bad=[...document.querySelectorAll('dialog')].filter(x=>!x.getAttribute('aria-labelledby'));if(bad.length)throw Error(`${bad.length} unlabeled dialogs`);return 'All dialogs labeled'});
 run('Required inputs labeled','Accessibility',()=>{const bad=[...document.querySelectorAll('input,select,textarea')].filter(x=>x.type!=='hidden'&&!x.closest('label')&&!x.getAttribute('aria-label')&&!x.getAttribute('aria-labelledby'));if(bad.length)throw Error(`${bad.length} unlabeled controls`);return 'All current controls labeled'});
 run('Keyboard focus target','Accessibility',()=>{if(!document.getElementById('mainContent'))throw Error('Main focus target missing');return 'Skip-link target available'});
 run('Report definitions serialize','Reports',()=>{JSON.stringify(state.reportDefinitions||[]);return `${(state.reportDefinitions||[]).length} definitions valid`});
 hardening.lastRegression={at:now(),tests,passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length};return hardening.lastRegression;
}
window.runRegressionV65=()=>{regressionTests();renderDiagnostics();toast(hardening.lastRegression.failed?'Regression suite found failures.':'All regression checks passed.',hardening.lastRegression.failed?'error':'info')};
function regressionHtml(){const r=hardening.lastRegression||regressionTests();return `<div class="card" style="margin-top:18px"><div class="section-head" style="margin:0"><div><div class="eyebrow">v6.5 release suite</div><h3>Regression and recovery tests</h3><p class="status">${r.passed} passed · ${r.failed} failed · run ${new Date(r.at).toLocaleString()}</p></div><button class="btn primary" onclick="runRegressionV65()">Run Suite</button></div>${r.tests.map(t=>`<div class="regression-row"><span class="test-status ${t.pass?'pass':'fail'}">${t.pass?'✓':'!'}</span><div><strong>${esc(t.name)}</strong><div class="status">${esc(t.group)} · ${esc(t.detail)} · ${t.ms.toFixed(1)} ms</div></div><span class="badge">${t.pass?'PASS':'FAIL'}</span></div>`).join('')}</div>`}

const priorDiagnostics=window.renderDiagnostics;
window.renderDiagnostics=function(){priorDiagnostics();diagnosticsView.insertAdjacentHTML('beforeend',regressionHtml())};
const priorSettings=window.renderSettings;
window.renderSettings=function(){priorSettings();const snaps=recoveryList();settingsView.insertAdjacentHTML('beforeend',`<div class="card" style="margin-top:18px"><div class="section-head" style="margin:0"><div><div class="eyebrow">Failure recovery</div><h3>Recovery points</h3><p class="status">Drift keeps up to ${RECOVERY_LIMIT} local safety snapshots before imports and during continued work.</p></div><button class="btn" onclick="createRecoverySnapshotV65()">Create Recovery Point</button></div>${snaps.length?snaps.map(s=>`<div class="recovery-row"><span class="test-status pass">↺</span><div><strong>${esc(s.reason)}</strong><div class="status">${new Date(s.createdAt).toLocaleString()} · ${esc(s.version||'Unknown version')} · ${(JSON.stringify(s.state).length/1024).toFixed(1)} KB</div></div><div class="toolbar"><button class="btn small" onclick="restoreRecoveryV65('${s.id}')">Restore</button><button class="btn small danger" onclick="deleteRecoveryV65('${s.id}')">Delete</button></div></div>`).join(''):'<div class="empty">No recovery points exist yet.</div>'}</div><div class="card keyboard-help" id="keyboardHelpV65" style="margin-top:18px"><div class="eyebrow">Keyboard navigation</div><h3>Shortcuts</h3><div class="hardening-grid"><div class="hardening-card"><span class="status">Global search</span><strong><kbd>/</kbd></strong></div><div class="hardening-card"><span class="status">New inquiry</span><strong><kbd>N</kbd></strong></div><div class="hardening-card"><span class="status">Quick capture</span><strong><kbd>Q</kbd></strong></div><div class="hardening-card"><span class="status">Close dialog or inspector</span><strong><kbd>Esc</kbd></strong></div></div><p class="status">Press <kbd>?</kbd> from outside a form to return to this help.</p></div>`);labelInteractiveElements()};

// Give users a recovery path if the current state cannot serialize cleanly.
window.addEventListener('error',e=>{console.error('Drift runtime error',e.error||e.message);announce('A Drift runtime error occurred. Diagnostics and recovery tools are available in Settings.')});
window.addEventListener('unhandledrejection',e=>{console.error('Drift promise rejection',e.reason);announce('A Drift operation failed. Your last recovery point remains available.')});
labelInteractiveElements();writeRecovery('v6.5 initialization',true);
})();
