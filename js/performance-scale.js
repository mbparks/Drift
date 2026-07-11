// Drift v6.4.0 Performance & Scale
(function(){
  const perf={index:null,indexVersion:'',saveTimer:null,dirty:false,lastSaveMs:0,lastSearchMs:0,lastIndexMs:0,pageSize:60,pages:{}};
  state.performance=Object.assign({imageQuality:.78,maxImageDimension:1800,saveDelay:450,warningMB:4,pageSize:60},state.performance||{});
  perf.pageSize=Number(state.performance.pageSize)||60;

  function status(text,cls=''){
    const el=document.getElementById('saveStatus');if(!el)return;el.className='status '+cls;el.textContent=text;
  }
  function serialized(){return JSON.stringify(state)}
  function flushState(){
    if(perf.saveTimer){clearTimeout(perf.saveTimer);perf.saveTimer=null}
    const started=performance.now();
    try{state.updatedAt=now();state.version=APP_VERSION;localStorage.setItem(STORAGE_KEY,serialized());perf.lastSaveMs=performance.now()-started;perf.dirty=false;status('Saved locally at '+new Date(state.updatedAt).toLocaleTimeString());return true}
    catch(error){console.error('Drift save failed',error);status('Save failed: '+(error.message||error),'save-error');return false}
  }
  window.flushStateV64=flushState;
  saveState=function(){
    perf.dirty=true;perf.index=null;status('Saving changes…','save-pending');
    if(perf.saveTimer)clearTimeout(perf.saveTimer);
    perf.saveTimer=setTimeout(flushState,Number(state.performance.saveDelay)||450);
  };
  window.addEventListener('beforeunload',()=>{if(perf.dirty)flushState()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&perf.dirty)flushState()});
  document.addEventListener('click',e=>{if(e.target?.id==='exportBtn'||e.target?.closest?.('[onclick*="export"]'))flushState()},{capture:true});

  function typeMap(){return {observations:'Observation',evidence:'Evidence',stations:'Station',changes:'Change',frictions:'Friction',rootCauses:'Root Cause',interventions:'Intervention',interventionEvents:'Intervention History',actions:'Action',stakeholders:'Stakeholder',interviewGuides:'Interview Guide',perspectives:'Perspective',themes:'Theme',forecasts:'Forecast',assumptions:'Assumption',experiments:'Experiment',inferences:'Inference',hypotheses:'Hypothesis',lessons:'Lesson',reviews:'Review'}}
  function buildIndex(){
    const started=performance.now(),rows=[],types=typeMap();
    state.inquiries.forEach(i=>Object.entries(types).forEach(([key,label])=>(i[key]||[]).forEach(r=>{
      const raw=[i.title,i.subject,label,...Object.values(r).filter(v=>typeof v==='string'||typeof v==='number')].join(' ').toLowerCase();
      rows.push({inquiryId:i.id,inquiryTitle:i.title,type:label,record:r,text:raw,tokens:new Set(raw.match(/[a-z0-9_-]{2,}/g)||[]),modified:r.updatedAt||r.createdAt||i.updatedAt||''});
    })));
    perf.index=rows;perf.indexVersion=state.updatedAt||'';perf.lastIndexMs=performance.now()-started;return rows;
  }
  searchableRecords=function(){return perf.index||buildIndex()};
  function scoreRow(x,terms){let score=0;const title=String(recordLabel(x.record)).toLowerCase();terms.forEach(t=>{if(title.includes(t))score+=8;if(x.inquiryTitle.toLowerCase().includes(t))score+=4;if(x.tokens.has(t))score+=3;else if(x.text.includes(t))score+=1});const age=(Date.now()-new Date(x.modified||0).getTime())/86400000;if(Number.isFinite(age))score+=Math.max(0,3-age/30);return score}
  runSearch=function(){
    const started=performance.now(),raw=(globalSearch.value||'').trim(),tokens=raw.split(/\s+/).filter(Boolean),terms=tokens.filter(t=>!t.includes(':')).map(t=>t.toLowerCase());
    let rows=searchableRecords().filter(x=>tokens.every(t=>{const [k,...rest]=t.split(':'),v=rest.join(':').toLowerCase();if(rest.length&&k==='type')return x.type.toLowerCase().includes(v);if(rest.length&&k==='status')return String(x.record.status||'open').toLowerCase().includes(v);if(rest.length&&k==='confidence'&&v==='low')return Number(x.record.confidence||100)<50;return rest.length?true:x.text.includes(t.toLowerCase())||x.inquiryTitle.toLowerCase().includes(t.toLowerCase())}));
    rows=rows.map(x=>({...x,_score:scoreRow(x,terms)})).sort((a,b)=>b._score-a._score||String(b.modified).localeCompare(String(a.modified)));
    perf.lastSearchMs=performance.now()-started;
    searchResults.innerHTML=rows.length?rows.slice(0,250).map(searchResultCard).join(''):`<div class="empty">No matching records.</div>`;
    const meta=document.getElementById('searchPerformanceV64');if(meta)meta.textContent=`${rows.length} results · ${perf.lastSearchMs.toFixed(1)} ms · ${searchableRecords().length} indexed records`;
  };
  const oldRenderSearch=renderSearch;
  renderSearch=function(){oldRenderSearch();const card=searchView.querySelector('.card');if(card){const p=document.createElement('p');p.id='searchPerformanceV64';p.className='status';p.textContent=`${searchableRecords().length} indexed records · index built in ${perf.lastIndexMs.toFixed(1)} ms`;card.insertBefore(p,card.querySelector('#searchResults'))}}

  const inspectorRender=renderRecords;
  renderRecords=function(type,arr){
    const visible=(arr||[]).filter(r=>!r._archived),key=(currentInquiryId||'global')+':'+type,limit=perf.pages[key]||perf.pageSize;
    if(visible.length<=limit)return inspectorRender(type,visible);
    const html=inspectorRender(type,visible.slice(0,limit));
    return html+`<div class="load-more"><button class="btn" onclick="loadMoreV64('${type}')">Show ${Math.min(perf.pageSize,visible.length-limit)} more · ${visible.length-limit} remaining</button></div>`;
  };
  window.loadMoreV64=function(type){const key=(currentInquiryId||'global')+':'+type;perf.pages[key]=(perf.pages[key]||perf.pageSize)+perf.pageSize;renderInquiry()};
  window.setPageSizeV64=function(value){state.performance.pageSize=Number(value);perf.pageSize=Number(value);perf.pages={};saveState()};

  const originalFileToDataUrl=fileToDataUrl;
  fileToDataUrl=async function(file){
    if(!file?.type?.startsWith('image/')||file.type==='image/svg+xml')return originalFileToDataUrl(file);
    const source=await originalFileToDataUrl(file),img=new Image();
    await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=source});
    const max=Number(state.performance.maxImageDimension)||1800,scale=Math.min(1,max/Math.max(img.width,img.height));
    if(scale===1&&file.size<700000)return source;
    const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',Number(state.performance.imageQuality)||.78);
  };

  function stats(){
    const json=serialized(),bytes=new Blob([json]).size,records=searchableRecords().length,relationships=state.inquiries.reduce((n,i)=>n+(i.relationships||[]).length,0),images=allEvidence().filter(e=>e.dataUrl).length;
    return {bytes,mb:bytes/1048576,records,relationships,images,inquiries:state.inquiries.length};
  }
  async function quota(){try{return await navigator.storage?.estimate?.()||{}}catch{return {}}}
  window.compactDatabaseV64=function(){
    if(!confirm('Compact stored data by trimming audit logs and empty properties? A backup is recommended first.'))return;
    state.auditLog=(state.auditLog||[]).slice(0,500);state.backupHistory=(state.backupHistory||[]).slice(-100);state.reportExportHistory=(state.reportExportHistory||[]).slice(-250);
    state.inquiries.forEach(i=>Object.values(i).forEach(v=>{if(Array.isArray(v))v.forEach(r=>{if(r&&typeof r==='object')Object.keys(r).forEach(k=>{if(r[k]===''||r[k]===null)delete r[k]})})}));
    flushState();renderSettings();alert('Database compaction complete.');
  };
  window.removeOrphanImagesV64=function(){
    const linked=new Set();state.inquiries.forEach(i=>(i.relationships||[]).forEach(r=>{linked.add(r.fromId);linked.add(r.toId)}));let n=0;
    state.inquiries.forEach(i=>(i.evidence||[]).forEach(e=>{if(e.dataUrl&&e._archived&&!linked.has(e.id)){delete e.dataUrl;n++}}));flushState();renderSettings();alert(`${n} archived, unlinked image attachment${n===1?'':'s'} removed.`)
  };
  window.generateFixtureV64=function(size='medium'){
    const cfg=size==='large'?{inq:25,obs:40,rel:200}:size==='small'?{inq:5,obs:15,rel:30}:{inq:12,obs:25,rel:80};
    if(!confirm(`Generate a ${size} performance fixture (${cfg.inq} inquiries)?`))return;const started=performance.now();
    for(let a=0;a<cfg.inq;a++){const iid=uid(),i={id:iid,title:`Scale Fixture ${a+1}`,subject:'Performance test',question:'Can Drift remain responsive at scale?',baseline:'Synthetic baseline',outcome:'Responsive operation',owner:'Test harness',createdAt:now(),updatedAt:now(),archived:false};if(typeof normalizeInquiryV6==='function')normalizeInquiryV6(i);else Object.assign(i,{observations:[],evidence:[],stations:[],changes:[],frictions:[],rootCauses:[],interventions:[],interventionEvents:[],actions:[],stakeholders:[],interviewGuides:[],perspectives:[],themes:[],forecasts:[],assumptions:[],experiments:[],inferences:[],hypotheses:[],relationships:[],lessons:[],reviews:[]});
      for(let n=0;n<cfg.obs;n++){i.observations.push({id:uid(),title:`Observation ${n+1}`,notes:`Synthetic field observation ${n+1} for search and rendering tests.`,status:n%7===0?'Open':'Recorded',confidence:String(50+n%50),createdAt:now()});if(n%3===0)i.evidence.push({id:uid(),title:`Evidence ${n+1}`,type:'Note',notes:'Synthetic evidence item.',quality:String(60+n%40),createdAt:now()});if(n%5===0)i.frictions.push({id:uid(),title:`Friction ${n+1}`,description:'Synthetic workflow friction.',priority:n%100,status:n%2?'Open':'Resolved',createdAt:now()})}
      const ids=[...i.observations,...i.evidence,...i.frictions].map(x=>x.id);for(let r=0;r<cfg.rel&&ids.length>1;r++)i.relationships.push({id:uid(),fromId:ids[r%ids.length],toId:ids[(r*7+1)%ids.length],relation:'supports',createdAt:now()});state.inquiries.push(i)}
    perf.index=null;flushState();alert(`Fixture generated in ${(performance.now()-started).toFixed(0)} ms.`);render();
  };

  const oldSettings=renderSettings;
  renderSettings=async function(){
    oldSettings();const s=stats(),q=await quota(),usage=q.usage||s.bytes,limit=q.quota||0,pct=limit?Math.min(100,usage/limit*100):0;
    const host=document.createElement('div');host.className='card';host.style.marginTop='18px';host.innerHTML=`<div class="eyebrow">v6.4 Performance & Scale</div><h3>Storage, rendering, and test controls</h3><div class="perf-grid"><div class="perf-card"><span class="status">Serialized data</span><strong>${s.mb.toFixed(2)} MB</strong></div><div class="perf-card"><span class="status">Indexed records</span><strong>${s.records}</strong></div><div class="perf-card"><span class="status">Relationships</span><strong>${s.relationships}</strong></div><div class="perf-card"><span class="status">Image attachments</span><strong>${s.images}</strong></div></div><div style="margin-top:16px"><div style="display:flex;justify-content:space-between"><strong>Browser storage estimate</strong><span>${limit?(usage/1048576).toFixed(1)+' / '+(limit/1048576).toFixed(0)+' MB':'Quota unavailable'}</span></div><div class="quota-meter" style="margin-top:7px"><span style="width:${pct}%"></span></div></div><div class="form-grid" style="margin-top:16px"><label>Image quality<input type="range" min="0.45" max="0.95" step="0.05" value="${state.performance.imageQuality}" onchange="state.performance.imageQuality=Number(this.value);saveState()"></label><label>Maximum image dimension<select onchange="state.performance.maxImageDimension=Number(this.value);saveState()">${[1200,1800,2400,3200].map(x=>`<option value="${x}" ${x==state.performance.maxImageDimension?'selected':''}>${x}px</option>`).join('')}</select></label><label>Autosave delay<select onchange="state.performance.saveDelay=Number(this.value);saveState()">${[250,450,800,1500].map(x=>`<option value="${x}" ${x==state.performance.saveDelay?'selected':''}>${x} ms</option>`).join('')}</select></label><label>Records per page<select onchange="setPageSizeV64(this.value)">${[30,60,100,150].map(x=>`<option value="${x}" ${x==state.performance.pageSize?'selected':''}>${x}</option>`).join('')}</select></label></div><div class="toolbar" style="margin-top:16px"><button class="btn" onclick="compactDatabaseV64()">Compact Database</button><button class="btn" onclick="removeOrphanImagesV64()">Clean Archived Images</button><button class="btn" onclick="generateFixtureV64('small')">Small Fixture</button><button class="btn" onclick="generateFixtureV64('medium')">Medium Fixture</button><button class="btn danger" onclick="generateFixtureV64('large')">Large Fixture</button></div><p class="status">Last save ${perf.lastSaveMs.toFixed(1)} ms · Search index ${perf.lastIndexMs.toFixed(1)} ms · Last search ${perf.lastSearchMs.toFixed(1)} ms</p>`;settingsView.appendChild(host)
  };

  state.version=APP_VERSION;perf.index=null;saveState();
})();
