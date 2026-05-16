/* ============================================
   zeittracker.js — Zeittracker Modul
   Wird in screen-zeit geladen
   ============================================ */

const SLOT_MIN = 30;
const SLOT_PX = 48;
const PX_PER_MIN = SLOT_PX / SLOT_MIN;
const TOTAL_SLOTS = 48;

const ZEIT_COLORS = {
  'Tiefarbeit':'#7a9e5a','E-Mails':'#5a8aae','Meeting':'#ae9a5a',
  'Handy/Social':'#ae5a5a','Admin/Orga':'#7a5aae','Pause':'#ae7a5a',
  'Lernen':'#5aae8a','Gespräch':'#ae6a5a','Schlafen':'#5a6aae','Sport':'#ae5a8a'
};
function zGetColor(a) { return ZEIT_COLORS[a] || '#707070'; }

let zViewDate = new Date();
let zReturnToDay = false;
let zEntrySlotTs = null;
let zEntryActivities = [];
let zSheetSlotTs = null;
let zCountdownInterval = null;

// ===== INIT =====
function initZeittracker() {
  const content = document.getElementById('zeitContent');
  if (!content) return;

  content.innerHTML = `
    <!-- HOME VIEW -->
    <div id="zHome">
      <div class="card" style="text-align:center;margin-bottom:12px">
        <div class="card-title">Nächster Check-In in</div>
        <div style="font-family:'Syne',sans-serif;font-size:48px;font-weight:800;color:var(--accent);letter-spacing:-3px;line-height:1" id="zCountdown">00:00</div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">um <span id="zNextTime">—</span> Uhr</div>
        <button class="btn btn-primary" id="zCheckinBtn" onclick="zStartEntry(null)" style="margin-top:14px">✓ Jetzt einchecken</button>
      </div>

      <div class="card" onclick="zShowDay()" style="cursor:pointer;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em">Heute im Überblick</div>
          <div style="font-size:11px;color:var(--accent)">Kalender →</div>
        </div>
        <div id="zMiniBar" style="display:flex;height:16px;border-radius:5px;overflow:hidden;gap:1px;background:var(--bg)"></div>
      </div>

      <div class="stat-grid" style="margin-bottom:12px">
        <div class="stat-cell"><div class="stat-num" id="zQs1">—</div><div class="stat-lbl">Wichtig</div></div>
        <div class="stat-cell"><div class="stat-num" id="zQs2">—</div><div class="stat-lbl">Geplant</div></div>
        <div class="stat-cell"><div class="stat-num" id="zQs3">—</div><div class="stat-lbl">Getrackt</div></div>
      </div>

      <button class="btn btn-ghost" onclick="zExportCSV()">↓ CSV exportieren</button>
    </div>

    <!-- DAY VIEW -->
    <div id="zDay" style="display:none">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <button class="btn btn-icon" onclick="zChangeDay(-1)">‹</button>
        <div style="text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800;letter-spacing:-0.5px" id="zDayTitle">Heute</div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-top:2px" id="zDaySubtitle"></div>
        </div>
        <button class="btn btn-icon" onclick="zChangeDay(1)">›</button>
      </div>
      <div id="zDayLegend" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-bottom:6px"></div>
      <div id="zDaySummary" style="padding:8px 0;border-top:1px solid var(--border);margin-bottom:10px"></div>
      <div style="position:relative;padding-left:48px" id="zTimeline"></div>
      <button class="btn btn-ghost" onclick="zShowHome()" style="margin-top:12px">← Zurück</button>
    </div>

    <!-- ENTRY VIEW -->
    <div id="zEntry" style="display:none">
      <div style="height:2px;background:var(--surface2);margin:-16px -20px 16px;flex-shrink:0">
        <div style="height:100%;background:var(--accent);transition:width 0.4s" id="zProgressBar" style="width:0%"></div>
      </div>
      <div id="zEntryContent"></div>
    </div>

    <!-- TOAST -->
    <div id="zToast" style="position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-80px);background:var(--text);color:var(--bg);padding:10px 22px;border-radius:30px;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);z-index:9999;white-space:nowrap;pointer-events:none"></div>

    <!-- SHEETS -->
    <div class="overlay-bg" id="zSheet">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px" id="zSheetTime"></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px" id="zSheetActs"></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-ghost" onclick="zSheetEdit()">✏️ &nbsp;Bearbeiten</button>
          <button class="btn btn-danger" onclick="zSheetDelete()">🗑 &nbsp;Löschen</button>
          <button class="btn btn-ghost" onclick="closeOverlay('zSheet')" style="color:var(--muted)">Abbrechen</button>
        </div>
      </div>
    </div>

    <div class="overlay-bg" id="zPicker">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">Aktivität hinzufügen</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          ${Object.keys(ZEIT_COLORS).map(name =>
            `<button style="padding:11px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:8px" onclick="zPickActivity('${name}')">
              <span style="width:8px;height:8px;border-radius:50%;background:${zGetColor(name)};flex-shrink:0;display:inline-block"></span>${name}
            </button>`
          ).join('')}
          <button style="grid-column:1/-1;padding:10px;background:var(--surface2);border:1px dashed var(--border);border-radius:10px;color:var(--muted);font-family:'DM Mono',monospace;font-size:12px;cursor:pointer" onclick="zOpenCustom()">✏️ Eigene Eingabe…</button>
        </div>
        <button class="btn btn-ghost" onclick="closeOverlay('zPicker')">Abbrechen</button>
      </div>
    </div>

    <div class="overlay-bg" id="zCustomOverlay">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">Eigene Aktivität</div>
        <input type="text" class="input" id="zCustomInput" placeholder="Was hast du gemacht?" maxlength="60" style="margin-bottom:12px">
        <button class="btn btn-primary" onclick="zConfirmCustom()">Übernehmen</button>
      </div>
    </div>
  `;

  zStartCountdown();
  zRenderMiniBar();
  zRenderQuickStats();
}

// ===== VIEWS =====
function zShowHome() {
  document.getElementById('zHome').style.display = 'block';
  document.getElementById('zDay').style.display = 'none';
  document.getElementById('zEntry').style.display = 'none';
  zRenderMiniBar();
  zRenderQuickStats();
}

function zShowDay() {
  document.getElementById('zHome').style.display = 'none';
  document.getElementById('zDay').style.display = 'block';
  document.getElementById('zEntry').style.display = 'none';
  zViewDate = new Date();
  zRenderDayView();
}

function zShowEntry() {
  document.getElementById('zHome').style.display = 'none';
  document.getElementById('zDay').style.display = 'none';
  document.getElementById('zEntry').style.display = 'block';
}

// ===== COUNTDOWN =====
function zStartCountdown() {
  if (zCountdownInterval) clearInterval(zCountdownInterval);
  zUpdateCountdown();
  zCountdownInterval = setInterval(zUpdateCountdown, 1000);
}

function zUpdateCountdown() {
  const el = document.getElementById('zCountdown');
  const nextEl = document.getElementById('zNextTime');
  if (!el) { clearInterval(zCountdownInterval); return; }
  const now = new Date(), next = zGetNextSlot(now);
  const diff = Math.max(0, Math.floor((next-now)/1000));
  const m = Math.floor(diff/60), s = diff%60;
  el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
  if (nextEl) nextEl.textContent = formatTime(next);
  const btn = document.getElementById('zCheckinBtn');
  if (btn) diff < 120 ? btn.style.animation='pulse 2s infinite' : btn.style.animation='';
}

function zGetNextSlot(now) {
  const d = new Date(now);
  d.getMinutes()<30 ? d.setMinutes(30,0,0) : d.setHours(d.getHours()+1,0,0,0);
  return d;
}

function zGetCurrentSlot(now) {
  const d = new Date(now);
  if (d.getMinutes()<30) { d.setMinutes(0,0,0); d.setTime(d.getTime()-30*60000); }
  else { d.setMinutes(0,0,0); }
  return d;
}

// ===== MINI BAR =====
function zRenderMiniBar() {
  const el = document.getElementById('zMiniBar');
  if (!el) return;
  const now = new Date(), dayStart = new Date(now); dayStart.setHours(0,0,0,0);
  const entries = DB.zeit.getEntries();
  let html = '';
  for (let i=0;i<TOTAL_SLOTS;i++) {
    const ts = dayStart.getTime()+i*SLOT_MIN*60000;
    const future = ts > now.getTime();
    const e = entries.find(e=>e.slotTs===ts);
    if (e && e.activities?.length) {
      const segs = e.activities.map(a=>`<div style="flex:${a.minutes};background:${zGetColor(a.name)}"></div>`).join('');
      html += `<div style="flex:1;display:flex;overflow:hidden">${segs}</div>`;
    } else {
      html += `<div style="flex:1;background:${future?'transparent':'#1e1e1e'};border:${future?'1px solid #282828':'none'}"></div>`;
    }
  }
  el.innerHTML = html;
}

function zRenderQuickStats() {
  const now = new Date(), dayStart = new Date(now); dayStart.setHours(0,0,0,0);
  const entries = DB.zeit.getEntries();
  const todayEntries = entries.filter(e=>e.slotTs>=dayStart.getTime()&&e.slotTs<dayStart.getTime()+86400000);
  const allActs = todayEntries.flatMap(e=>e.activities||[]);
  const n = allActs.length;
  if (!n) { ['zQs1','zQs2','zQs3'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='—';}); return; }
  const imp = Math.round(allActs.filter(a=>a.important==='ja').length/n*100);
  const plan = Math.round(allActs.filter(a=>a.planned==='geplant').length/n*100);
  const hours = Math.round(todayEntries.length*SLOT_MIN/60*10)/10;
  const q1=document.getElementById('zQs1'),q2=document.getElementById('zQs2'),q3=document.getElementById('zQs3');
  if(q1)q1.textContent=imp+'%';if(q2)q2.textContent=plan+'%';if(q3)q3.textContent=hours+'h';
}

// ===== ENTRY =====
function zStartEntry(slotTs) {
  const now = new Date();
  const slot = slotTs!==null ? new Date(slotTs) : zGetCurrentSlot(now);
  const slotEnd = new Date(slot.getTime()+SLOT_MIN*60000);
  zEntrySlotTs = slot.getTime();
  const existing = DB.zeit.getEntries().find(e=>e.slotTs===zEntrySlotTs);
  zEntryActivities = existing ? JSON.parse(JSON.stringify(existing.activities)) : [];
  zShowEntry();
  zRenderEntryUI();
}

function zMinsUsed() { return zEntryActivities.reduce((s,a)=>s+a.minutes,0); }
function zMinsLeft() { return SLOT_MIN - zMinsUsed(); }

function zRenderEntryUI() {
  const slot = new Date(zEntrySlotTs);
  const slotEnd = new Date(zEntrySlotTs+SLOT_MIN*60000);
  const left = zMinsLeft();

  let barHtml = zEntryActivities.map(a=>`<div style="flex:${a.minutes};background:${zGetColor(a.name)};height:100%;border-radius:3px"></div>`).join('');
  if(left>0) barHtml+=`<div style="flex:${left};height:100%;background:var(--surface2)"></div>`;

  const rows = zEntryActivities.map((act,idx)=>{
    const maxForThis = act.minutes+left;
    return `<div class="card" style="margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;font-size:13px">
          <div style="width:8px;height:8px;border-radius:50%;background:${zGetColor(act.name)};flex-shrink:0"></div>
          ${act.name}
        </div>
        <button onclick="zRemoveAct(${idx})" style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:4px">✕</button>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--accent);min-width:28px" id="zMV${idx}">${act.minutes}</div>
        <div style="font-size:11px;color:var(--muted)">min</div>
        <input type="range" min="1" max="${maxForThis}" step="1" value="${act.minutes}" oninput="zUpdateMins(${idx},this.value)" ${act.locked?'disabled':''} style="flex:1">
        <button onclick="zToggleLock(${idx})" style="background:none;border:1px solid var(--border);border-radius:8px;padding:4px 8px;color:${act.locked?'var(--accent)':'var(--muted)'};font-size:13px;cursor:pointer;flex-shrink:0">${act.locked?'🔒':'🔓'}</button>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:10px;display:flex;flex-direction:column;gap:8px">
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px">Wichtig?</div>
          <div style="display:flex;gap:6px">
            ${['ja','teilweise','nein'].map(v=>`<button class="chip ${act.important===v?'sel':''}" onclick="zSetQ(${idx},'important','${v}')">${v==='ja'?'Ja':v==='teilweise'?'Teilweise':'Nein'}</button>`).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px">Ziel-fit?</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${['ja','indirekt','nein'].map(v=>`<button class="chip ${act.goals===v?'sel':''}" onclick="zSetQ(${idx},'goals','${v}')">${v==='ja'?'🎯 Ja':v==='indirekt'?'↪ Indirekt':'Nein'}</button>`).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px">Geplant?</div>
          <div style="display:flex;gap:6px">
            ${['geplant','reaktiv'].map(v=>`<button class="chip ${act.planned===v?'sel':''}" onclick="zSetQ(${idx},'planned','${v}')">${v==='geplant'?'📋 Geplant':'⚡ Reaktiv'}</button>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  const allOk = zEntryActivities.length>0 && zEntryActivities.every(a=>a.name&&a.important&&a.goals&&a.planned);

  document.getElementById('zEntryContent').innerHTML = `
    <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px">Check-In</div>
    <div style="display:inline-flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:5px 12px;font-size:12px;color:var(--accent);margin-bottom:14px">
      🕐 ${formatTime(slot)} – ${formatTime(slotEnd)}
    </div>
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:5px">
        <span>Zeit verteilt</span><span style="color:var(--text)">${left>0?left+' min übrig':'30 min voll ✓'}</span>
      </div>
      <div style="height:7px;background:var(--surface2);border-radius:4px;overflow:hidden;display:flex;gap:1px">${barHtml}</div>
    </div>
    ${rows}
    <button class="btn btn-ghost" onclick="openOverlay('zPicker')" ${left<=0?'disabled':''} style="margin-bottom:10px;${left<=0?'opacity:0.3':''}"}>+ Aktivität hinzufügen</button>
    <div style="display:flex;gap:10px">
      <button class="btn btn-ghost" onclick="${zReturnToDay?'zShowDay()':'zShowHome()'}" style="flex:0 0 auto;padding:14px 16px">Abbrechen</button>
      <button class="btn btn-primary" onclick="zSaveEntry()" ${!allOk?'disabled':''} style="${!allOk?'opacity:0.25':''}">Speichern ✓</button>
    </div>
  `;
}

function zUpdateMins(idx,val) {
  if(zEntryActivities[idx].locked) return;
  const newVal=parseInt(val), diff=newVal-zEntryActivities[idx].minutes;
  if(zMinsLeft()-diff<0) return;
  zEntryActivities[idx].minutes=newVal;
  const el=document.getElementById('zMV'+idx); if(el) el.textContent=newVal;
  zRenderEntryUI();
}
function zToggleLock(idx) { zEntryActivities[idx].locked=!zEntryActivities[idx].locked; zRenderEntryUI(); }
function zRemoveAct(idx) { zEntryActivities.splice(idx,1); zRenderEntryUI(); }
function zSetQ(idx,field,val) { zEntryActivities[idx][field]=val; zRenderEntryUI(); }

function zSaveEntry() {
  DB.zeit.addEntry({ slotTs:zEntrySlotTs, ts:Date.now(), id:Math.random().toString(36).slice(2), activities:zEntryActivities });
  zReturnToDay ? zShowDay() : zShowHome();
  zReturnToDay=false;
  showToast('Eingetragen ✓');
}

// ===== PICKER =====
function zPickActivity(name) {
  closeOverlay('zPicker');
  const left=zMinsLeft(); if(left<=0) return;
  zEntryActivities.push({name,minutes:left,important:'',goals:'',planned:''});
  zRenderEntryUI();
}
function zOpenCustom() { closeOverlay('zPicker'); openOverlay('zCustomOverlay'); setTimeout(()=>document.getElementById('zCustomInput')?.focus(),100); }
function zConfirmCustom() {
  const val=document.getElementById('zCustomInput')?.value.trim(); if(!val) return;
  document.getElementById('zCustomInput').value='';
  closeOverlay('zCustomOverlay');
  const left=zMinsLeft(); if(left<=0) return;
  zEntryActivities.push({name:val,minutes:left,important:'',goals:'',planned:''});
  zRenderEntryUI();
}

// ===== SHEET =====
function zOpenSheet(slotTs) {
  zSheetSlotTs=slotTs;
  const e=DB.zeit.getEntries().find(e=>e.slotTs===slotTs); if(!e) return;
  const d=new Date(slotTs), end=new Date(slotTs+SLOT_MIN*60000);
  const t=document.getElementById('zSheetTime'); if(t) t.textContent=`${formatTime(d)} – ${formatTime(end)}`;
  const a=document.getElementById('zSheetActs');
  if(a) a.innerHTML=(e.activities||[]).map(act=>`<div class="chip"><span style="width:7px;height:7px;border-radius:50%;background:${zGetColor(act.name)};display:inline-block"></span>${act.name} · ${act.minutes} min</div>`).join('');
  openOverlay('zSheet');
}
function zSheetEdit() { const ts=zSheetSlotTs; closeOverlay('zSheet'); zReturnToDay=true; zStartEntry(ts); }
function zSheetDelete() {
  if(zSheetSlotTs===null) return;
  DB.zeit.deleteEntry(zSheetSlotTs);
  closeOverlay('zSheet');
  zRenderDayView();
  showToast('Gelöscht');
}

// ===== DAY VIEW =====
function zChangeDay(dir) { zViewDate=new Date(zViewDate); zViewDate.setDate(zViewDate.getDate()+dir); zRenderDayView(); }

function zRenderDayView() {
  const now=new Date(), isToday=zViewDate.toDateString()===now.toDateString();
  const titleEl=document.getElementById('zDayTitle'), subEl=document.getElementById('zDaySubtitle');
  if(titleEl) titleEl.textContent=isToday?'Heute':zViewDate.toLocaleDateString('de',{weekday:'long',day:'numeric',month:'long'});
  if(subEl) subEl.textContent=zViewDate.toLocaleDateString('de',{day:'numeric',month:'long',year:'numeric'});

  const dayStart=new Date(zViewDate); dayStart.setHours(0,0,0,0);
  const tl=document.getElementById('zTimeline'); if(!tl) return;
  tl.style.height=(TOTAL_SLOTS*SLOT_PX)+'px';

  const entries=DB.zeit.getEntries();
  let html='';
  for(let h=0;h<=24;h++){
    const top=h*2*SLOT_PX;
    html+=`<div style="position:absolute;left:-8px;right:0;height:1px;background:var(--border);top:${top}px;pointer-events:none"></div>`;
    if(h<24) html+=`<div style="position:absolute;left:-40px;font-size:10px;color:var(--muted);width:36px;text-align:right;top:${top}px;transform:translateY(-50%);pointer-events:none">${h.toString().padStart(2,'0')}:00</div>`;
  }
  for(let i=0;i<TOTAL_SLOTS;i++){
    const slotTs=dayStart.getTime()+i*SLOT_MIN*60000;
    const slotDate=new Date(slotTs);
    if(isToday&&slotTs>now.getTime()) continue;
    const e=entries.find(e=>e.slotTs===slotTs);
    const top=i*SLOT_PX, h=SLOT_PX-2;
    if(e&&e.activities?.length){
      const segs=e.activities.map(a=>`<div style="flex:${a.minutes};height:100%;display:flex;flex-direction:column;justify-content:center;padding:4px 6px;overflow:hidden;background:${zGetColor(a.name)}"><div style="font-size:10px;font-weight:500;color:#f0ede6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</div><div style="font-size:9px;color:rgba(240,237,230,0.6)">${a.minutes}m</div></div>`).join('');
      html+=`<div style="position:absolute;left:0;right:0;top:${top}px;height:${h}px;display:flex;gap:1px;border-radius:6px;overflow:hidden;cursor:pointer" onclick="zOpenSheet(${slotTs})">${segs}</div>`;
    } else {
      const slotEnd=new Date(slotTs+SLOT_MIN*60000);
      html+=`<div style="position:absolute;left:0;right:0;top:${top}px;height:${h}px;cursor:pointer" onclick="zFillSlot(${slotTs})"><div style="height:100%;background:#161616;border:1px dashed #2a2a2a;border-radius:6px;display:flex;align-items:center;padding:0 8px"><div style="font-size:10px;color:#303030">${formatTime(slotDate)} – ${formatTime(slotEnd)}</div></div></div>`;
    }
  }
  if(isToday){
    const nowMin=now.getHours()*60+now.getMinutes(), top=nowMin*PX_PER_MIN;
    html+=`<div style="position:absolute;left:-8px;right:0;height:2px;background:var(--danger);top:${top}px;z-index:10;pointer-events:none"></div>`;
    html+=`<div style="position:absolute;left:-14px;width:10px;height:10px;border-radius:50%;background:var(--danger);top:${top}px;transform:translateY(-50%);z-index:10;pointer-events:none"></div>`;
  }
  tl.innerHTML=html;
  setTimeout(()=>{
    const scr=tl.closest('.screen-content');
    if(scr&&isToday) scr.scrollTop=Math.max(0,(now.getHours()*60+now.getMinutes())*PX_PER_MIN-120);
    else if(scr) scr.scrollTop=0;
  },50);

  zRenderDayLegend(dayStart, entries);
  zRenderDaySummary(dayStart, isToday, entries);
}

function zFillSlot(slotTs) { zReturnToDay=true; zStartEntry(slotTs); }

function zRenderDayLegend(dayStart, entries) {
  const el=document.getElementById('zDayLegend'); if(!el) return;
  const used={};
  for(let i=0;i<TOTAL_SLOTS;i++){
    const e=entries.find(e=>e.slotTs===dayStart.getTime()+i*SLOT_MIN*60000);
    if(e) e.activities?.forEach(a=>{used[a.name]=true;});
  }
  el.innerHTML=Object.keys(used).map(a=>`<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted)"><div style="width:7px;height:7px;border-radius:50%;background:${zGetColor(a)}"></div>${a}</div>`).join('')+
    `<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted)"><div style="width:7px;height:7px;border-radius:50%;background:#1e1e1e;border:1px solid #333"></div>Ungetrackt</div>`;
}

function zRenderDaySummary(dayStart, isToday, entries) {
  const el=document.getElementById('zDaySummary'); if(!el) return;
  const now=new Date(); const actMins={}; let tracked=0,untracked=0;
  for(let i=0;i<TOTAL_SLOTS;i++){
    const slotTs=dayStart.getTime()+i*SLOT_MIN*60000;
    if(isToday&&slotTs>now.getTime()) continue;
    const e=entries.find(e=>e.slotTs===slotTs);
    if(e&&e.activities?.length){e.activities.forEach(a=>{actMins[a.name]=(actMins[a.name]||0)+a.minutes;});tracked++;}
    else untracked++;
  }
  const total=tracked+untracked; if(!total){el.innerHTML='';return;}
  const segs=Object.entries(actMins).map(([a,m])=>`<div style="flex:${m};background:${zGetColor(a)}"></div>`).join('');
  const uSeg=untracked?`<div style="flex:${untracked*SLOT_MIN};background:#1e1e1e"></div>`:'';
  el.innerHTML=`<div style="display:flex;height:6px;border-radius:3px;overflow:hidden;gap:1px;background:var(--surface2);margin-bottom:8px">${segs}${uSeg}</div>
    <div style="display:flex;gap:14px">
      <div style="font-size:11px;color:var(--muted)">Getrackt: <span style="color:var(--text)">${Math.round(tracked*SLOT_MIN/60*10)/10}h</span></div>
      <div style="font-size:11px;color:var(--muted)">Offen: <span style="color:var(--text)">${Math.round(untracked*SLOT_MIN/60*10)/10}h</span></div>
      <div style="font-size:11px;color:var(--muted)">Slots: <span style="color:var(--text)">${tracked}/${total}</span></div>
    </div>`;
}

// ===== EXPORT =====
function zExportCSV() {
  const entries=DB.zeit.getEntries();
  if(!entries.length){showToast('Keine Daten');return;}
  const header=['Datum','Slot','Aktivität','Minuten','Wichtig','Ziel-fit','Geplant/Reaktiv'];
  const rows=[];
  entries.forEach(e=>{
    const d=new Date(e.slotTs||e.ts);
    (e.activities||[]).forEach(a=>{
      rows.push([d.toLocaleDateString('de'),formatTime(d),a.name,a.minutes,a.important,a.goals,a.planned].map(v=>`"${v}"`).join(','));
    });
  });
  const csv=[header.join(','),...rows].join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`zeittracker_${new Date().toLocaleDateString('de',{month:'long',year:'numeric'})}.csv`;
  a.click(); URL.revokeObjectURL(url); showToast('CSV exportiert ✓');
}
