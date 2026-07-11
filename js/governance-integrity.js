// Drift v5.5 Governance & Integrity
function ensureGovernance(i){
 i.lifecycle ||= {status:'Active',gate:'Frame',reviewDate:'',retention:'Indefinite',classification:'Internal',closeoutOwner:i.owner||'',decision:'Continue',notes:''};
 state.auditLog ||= []; state.backupHistory ||= []; return i.lifecycle;
}
state.auditLog ||= []; state.backupHistory ||= []; state.inquiries.forEach(ensureGovernance);
function audit(action,detail='',inquiryId=''){
 state.auditLog.push({id:uid(),date:now(),action,detail,inquiryId});
 if(state.auditLog.length>250)state.auditLog=state.auditLog.slice(-250);
}
function renderAuditLog(limit=20){
 const rows=(state.auditLog||[]).slice(-limit).reverse();
 if(!rows.length)return '<div class="empty">No audit activity recorded yet.</div>';
 return '<table class="audit-table"><thead><tr><th>Date</th><th>Action</th><th>Detail</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(new Date(x.date).toLocaleString())+'</td><td>'+esc(x.action)+'</td><td>'+esc(x.detail||'')+'</td></tr>').join('')+'</tbody></table>';
}
function renderGovernance(i){
 const g=ensureGovernance(i),gates=['Frame','Observe','Diagnose','Engage','Test','Review','Close'],idx=Math.max(0,gates.indexOf(g.gate));
 return `<div class="lifecycle-banner"><div><div class="eyebrow">Inquiry lifecycle</div><h3 style="margin:.25rem 0">${esc(g.status)} · ${esc(g.gate)} gate</h3><p class="status">Decision: ${esc(g.decision||'Continue')}</p></div><button class="btn primary" onclick="saveGovernance()">Save Governance</button></div><div class="governance-grid" style="margin-top:16px">${gates.map((x,n)=>`<div class="card gate-card ${n<idx?'complete':n===idx?'current':''}"><div class="eyebrow">Gate ${n+1}</div><h3>${x}</h3><p class="status">${n<idx?'Completed':n===idx?'Current lifecycle gate':'Not reached'}</p></div>`).join('')}</div><div class="card" style="margin-top:18px"><h3>Governance record</h3><div class="form-grid"><label>Status<select id="govStatus">${['Draft','Active','On Hold','Closing','Closed'].map(x=>`<option ${g.status===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Current gate<select id="govGate">${gates.map(x=>`<option ${g.gate===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Next review<input id="govReview" type="date" value="${esc(g.reviewDate||'')}"></label><label>Closeout owner<input id="govOwner" value="${esc(g.closeoutOwner||'')}"></label><label>Information classification<select id="govClass">${['Public','Internal','Confidential','Restricted'].map(x=>`<option ${g.classification===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Retention<select id="govRetention">${['1 year','3 years','7 years','Indefinite'].map(x=>`<option ${g.retention===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Governance decision<select id="govDecision">${['Continue','Reframe','Pause','Escalate','Close'].map(x=>`<option ${g.decision===x?'selected':''}>${x}</option>`).join('')}</select></label><label style="grid-column:1/-1">Decision notes<textarea id="govNotes">${esc(g.notes||'')}</textarea></label></div></div><div class="card" style="margin-top:18px"><h3>Inquiry audit trail</h3>${renderAuditLog(30)}</div>`;
}
function saveGovernance(){const i=getInquiry(),g=ensureGovernance(i);Object.assign(g,{status:govStatus.value,gate:govGate.value,reviewDate:govReview.value,closeoutOwner:govOwner.value,classification:govClass.value,retention:govRetention.value,decision:govDecision.value,notes:govNotes.value});audit('Governance updated',g.status+' / '+g.gate+' / '+g.decision,i.id);saveState();renderInquiry()}
async function sha256(text){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function exportVerifiedBackup(){
 const payload={schema:'drift-backup',appVersion:APP_VERSION,exportedAt:now(),state};
 const checksum=await sha256(JSON.stringify(payload));
 const packageData={...payload,checksum:{algorithm:'SHA-256',value:checksum}};
 const blob=new Blob([JSON.stringify(packageData,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`drift-v${APP_VERSION}-verified-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
 state.backupHistory.push({date:now(),checksum,bytes:blob.size});audit('Verified backup exported',checksum.slice(0,16)+'…');saveState();renderSettings();
}
const originalToggleArchive=toggleArchive;
toggleArchive=function(id){const i=state.inquiries.find(x=>x.id===id),was=i?.archived;originalToggleArchive(id);audit(was?'Inquiry restored':'Inquiry archived',i?.title||'',id);saveState()}
const originalLoadDemo=loadDemo;
loadDemo=function(){originalLoadDemo();audit('Demo loaded','Workshop Entrance Wayfinding',currentInquiryId);saveState()}
