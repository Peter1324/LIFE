/* ============================================
   dashboard.js — Dashboard & Statistiken
   Übersicht: Zeittracker, GTD, Gym
   ============================================ */

// ===== INIT =====
function initDashboard() {
  const content = document.getElementById('screen-dashboard').querySelector('.screen-content');
  if (!content) return;
  content.innerHTML = `<div id="dashContent"></div>`;
  dashRender();
}

function initStats() {
  const content = document.getElementById('screen-stats').querySelector('.screen-content');
  if (!content) return;
  content.innerHTML = `<div id="statsContent"></div>`;
  statsRender();
}

// ===== DASHBOARD =====
function dashRender() {
  const el = document.getElementById('dashContent');
  if (!el) return;

  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0,0,0,0);

  // Daten holen
  const zeitEntries = DB.zeit.getEntries().filter(e =>
    e.slotTs >= dayStart.getTime() && e.slotTs < dayStart.getTime() + 86400000
  );
  const allZeitActs = zeitEntries.flatMap(e => e.activities||[]);
  const gtdItems = DB.gtd.getItems();
  const todayGtd = gtdItems.filter(i => i.today);
  const todayDone = todayGtd.filter(i => i.done);
  const gymSessions = DB.gym.getSessions();
  const todayGym = gymSessions.find(s => new Date(s.date).toDateString() === now.toDateString());

  el.innerHTML = `
    <!-- Greeting -->
    <div style="margin-bottom:20px">
      <div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;letter-spacing:-1px;line-height:1.1">
        ${dashGreeting()}
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px">
        ${now.toLocaleDateString('de',{weekday:'long',day:'numeric',month:'long'})}
      </div>
    </div>

    <!-- Tagesplan GTD -->
    <div class="card" style="margin-bottom:10px;cursor:pointer" onclick="navigate('gtd')">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="card-title" style="margin:0">Tagesplan</div>
        <div style="font-size:11px;color:var(--accent)">${todayDone.length}/${todayGtd.length} erledigt</div>
      </div>
      ${todayGtd.length === 0 ? `
        <div style="font-size:12px;color:var(--muted);font-style:italic">Noch nicht geplant — Aufgaben Tab öffnen</div>` : `
        <div style="display:flex;flex-direction:column;gap:5px">
          ${todayGtd.slice(0,4).map(i=>`
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:16px;height:16px;border-radius:50%;border:2px solid ${i.done?'var(--accent)':'var(--border)'};background:${i.done?'var(--accent)':'none'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                ${i.done?'<div style="width:6px;height:6px;border-radius:50%;background:#0f0f0f"></div>':''}
              </div>
              <div style="font-size:12px;${i.done?'text-decoration:line-through;color:var(--muted)':''}">${i.text}</div>
              ${i.priority?`<div style="font-size:9px;padding:1px 5px;border-radius:8px;background:${GTD_PRIORITY?.[i.priority]?.color||'var(--surface2)'}20;color:${GTD_PRIORITY?.[i.priority]?.color||'var(--muted)'};border:1px solid ${GTD_PRIORITY?.[i.priority]?.color||'var(--border)'}40;flex-shrink:0">${i.priority}</div>`:''}
            </div>`).join('')}
          ${todayGtd.length>4?`<div style="font-size:11px;color:var(--muted);margin-top:2px">+${todayGtd.length-4} weitere</div>`:''}
        </div>`
      }
    </div>

    <!-- Zeittracker heute -->
    <div class="card" style="margin-bottom:10px;cursor:pointer" onclick="navigate('zeit')">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="card-title" style="margin:0">Zeit heute</div>
        <div style="font-size:11px;color:var(--muted)">${Math.round(zeitEntries.length*30/60*10)/10}h getrackt</div>
      </div>
      ${allZeitActs.length === 0 ? `
        <div style="font-size:12px;color:var(--muted);font-style:italic">Noch kein Check-In heute</div>` : `
        ${dashZeitBar(allZeitActs)}
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          ${dashZeitTopActs(allZeitActs)}
        </div>`
      }
    </div>

    <!-- Gym heute -->
    <div class="card" style="margin-bottom:10px;cursor:pointer" onclick="navigate('gym')">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div class="card-title" style="margin:0 0 4px">Gym heute</div>
          ${todayGym ? `
            <div style="font-size:13px">${todayGym.exercises?.length||0} Übungen · ${
              (todayGym.exercises||[]).reduce((s,e)=>s+(e.sets||[]).length,0)
            } Sätze</div>` : `
            <div style="font-size:12px;color:var(--muted);font-style:italic">Kein Training heute</div>`
          }
        </div>
        <div style="font-size:24px">${todayGym?'💪':'🛌'}</div>
      </div>
    </div>

    <!-- Inbox GTD -->
    ${dashInboxCard(gtdItems)}

    <!-- Woche im Überblick -->
    ${dashWeekCard()}
  `;
}

function dashGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Guten Morgen 🌅';
  if (h < 17) return 'Guten Tag ☀️';
  if (h < 21) return 'Guten Abend 🌆';
  return 'Gute Nacht 🌙';
}

function dashZeitBar(acts) {
  const total = acts.reduce((s,a)=>s+a.minutes,0)||1;
  const byAct = {};
  acts.forEach(a=>{ byAct[a.name]=(byAct[a.name]||0)+a.minutes; });
  const segs = Object.entries(byAct).map(([name,mins])=>
    `<div style="flex:${mins};background:${zGetColor?.(name)||'#555'};min-width:2px"></div>`
  ).join('');
  return `<div style="height:8px;border-radius:4px;overflow:hidden;display:flex;gap:1px;background:var(--surface2)">${segs}</div>`;
}

function dashZeitTopActs(acts) {
  const byAct = {};
  acts.forEach(a=>{ byAct[a.name]=(byAct[a.name]||0)+a.minutes; });
  return Object.entries(byAct)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,4)
    .map(([name,mins])=>`
      <div style="display:flex;align-items:center;gap:5px">
        <div style="width:7px;height:7px;border-radius:50%;background:${zGetColor?.(name)||'#555'}"></div>
        <div style="font-size:11px;color:var(--muted)">${name} <span style="color:var(--text)">${mins}m</span></div>
      </div>`).join('');
}

function dashInboxCard(gtdItems) {
  const inbox = gtdItems.filter(i=>i.folder==='inbox'&&!i.done);
  if (!inbox.length) return '';
  return `
    <div class="card" style="margin-bottom:10px;cursor:pointer;border-color:${inbox.length>5?'rgba(192,64,64,0.4)':'var(--border)'}" onclick="navigate('gtd')">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="card-title" style="margin:0">📥 Inbox</div>
        <div style="font-size:13px;font-family:'Syne',sans-serif;font-weight:800;color:${inbox.length>5?'var(--danger)':'var(--text)'}">${inbox.length}</div>
      </div>
      ${inbox.length>5?`<div style="font-size:11px;color:var(--danger);margin-top:6px">Inbox leeren — zu viel angestaut</div>`:''}
    </div>`;
}

function dashWeekCard() {
  const now = new Date();
  const days = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(now); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
    const dayEntries = DB.zeit.getEntries().filter(e=>e.slotTs>=d.getTime()&&e.slotTs<d.getTime()+86400000);
    const hasGym = DB.gym.getSessions().some(s=>new Date(s.date).toDateString()===d.toDateString());
    const trackedH = Math.round(dayEntries.length*30/60*10)/10;
    days.push({ date:d, trackedH, hasGym, isToday:i===0 });
  }

  const maxH = Math.max(...days.map(d=>d.trackedH), 1);

  return `
    <div class="card">
      <div class="card-title">Letzte 7 Tage</div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:80px;margin-bottom:8px">
        ${days.map(d=>{
          const pct = (d.trackedH/maxH)*100;
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end">
              ${d.hasGym?`<div style="font-size:10px">💪</div>`:'<div style="font-size:10px"> </div>'}
              <div style="width:100%;background:${d.isToday?'var(--accent)':'#4a6a3a'};border-radius:4px 4px 0 0;min-height:3px" style="height:${Math.max(pct,3)}%">
                <div style="height:${Math.max(pct,3)}%;min-height:3px;background:${d.isToday?'var(--accent)':'#4a6a3a'};border-radius:4px 4px 0 0"></div>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:4px">
        ${days.map(d=>`
          <div style="flex:1;text-align:center;font-size:9px;color:${d.isToday?'var(--accent)':'var(--muted)'}">
            ${d.date.toLocaleDateString('de',{weekday:'short'}).slice(0,2)}
          </div>`).join('')}
      </div>
    </div>`;
}

// ===== STATISTIKEN =====
function statsRender() {
  const el = document.getElementById('statsContent');
  if (!el) return;

  el.innerHTML = `
    <!-- Zeitraum Auswahl -->
    <div style="display:flex;gap:6px;margin-bottom:16px" id="statsPeriodBtns">
      <button class="chip sel" id="statsBtnWeek" onclick="statsSetPeriod('week')">Woche</button>
      <button class="chip" id="statsBtnMonth" onclick="statsSetPeriod('month')">Monat</button>
      <button class="chip" id="statsBtnAll" onclick="statsSetPeriod('all')">Gesamt</button>
    </div>
    <div id="statsBody"></div>
  `;

  statsSetPeriod('week');
}

let statsPeriod = 'week';

function statsSetPeriod(period) {
  statsPeriod = period;
  ['week','month','all'].forEach(p=>{
    const btn = document.getElementById('statsBtn'+p.charAt(0).toUpperCase()+p.slice(1));
    if (btn) btn.classList.toggle('sel', p===period);
  });
  statsRenderBody();
}

function statsRenderBody() {
  const el = document.getElementById('statsBody');
  if (!el) return;

  const now = new Date();
  let fromDate = new Date(now);
  if (statsPeriod==='week') fromDate.setDate(fromDate.getDate()-7);
  else if (statsPeriod==='month') fromDate.setMonth(fromDate.getMonth()-1);
  else fromDate = new Date(0);

  const zeitEntries = DB.zeit.getEntries().filter(e=>e.slotTs>=fromDate.getTime());
  const allActs = zeitEntries.flatMap(e=>e.activities||[]);
  const gtdItems = DB.gtd.getItems();
  const gymSessions = DB.gym.getSessions().filter(s=>s.date>=fromDate.getTime());

  el.innerHTML = `
    <!-- Zeittracker Statistiken -->
    <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;margin-bottom:10px;letter-spacing:-0.5px">⏱ Zeittracker</div>

    <div class="stat-grid" style="margin-bottom:12px">
      <div class="stat-cell">
        <div class="stat-num">${Math.round(zeitEntries.length*30/60*10)/10}</div>
        <div class="stat-lbl">Stunden</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">${allActs.length?Math.round(allActs.filter(a=>a.important==='ja').length/allActs.length*100):0}%</div>
        <div class="stat-lbl">Wichtig</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">${allActs.length?Math.round(allActs.filter(a=>a.planned==='geplant').length/allActs.length*100):0}%</div>
        <div class="stat-lbl">Geplant</div>
      </div>
    </div>

    ${statsActBreakdown(allActs)}

    <div class="divider" style="margin:16px 0"></div>

    <!-- GTD Statistiken -->
    <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;margin-bottom:10px;letter-spacing:-0.5px">✅ Aufgaben</div>

    <div class="stat-grid" style="margin-bottom:12px">
      <div class="stat-cell">
        <div class="stat-num">${gtdItems.filter(i=>i.done&&i.doneAt>=fromDate.getTime()).length}</div>
        <div class="stat-lbl">Erledigt</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">${gtdItems.filter(i=>i.folder==='inbox'&&!i.done).length}</div>
        <div class="stat-lbl">In Inbox</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">${DB.gtd.getProjects().filter(p=>!p.done).length}</div>
        <div class="stat-lbl">Projekte</div>
      </div>
    </div>

    <div class="divider" style="margin:16px 0"></div>

    <!-- Gym Statistiken -->
    <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;margin-bottom:10px;letter-spacing:-0.5px">💪 Gym</div>

    <div class="stat-grid" style="margin-bottom:12px">
      <div class="stat-cell">
        <div class="stat-num">${gymSessions.length}</div>
        <div class="stat-lbl">Trainings</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">${gymSessions.reduce((s,sess)=>s+(sess.exercises||[]).length,0)}</div>
        <div class="stat-lbl">Übungen</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">${gymSessions.reduce((s,sess)=>s+(sess.exercises||[]).reduce((s2,e)=>s2+(e.sets||[]).length,0),0)}</div>
        <div class="stat-lbl">Sätze</div>
      </div>
    </div>

    ${statsGymTopExercises(gymSessions)}

    <!-- Export -->
    <div class="divider" style="margin:16px 0"></div>
    <button class="btn btn-ghost" onclick="DB.exportAll()" style="margin-bottom:8px">↓ Komplettes Backup exportieren</button>
    <button class="btn btn-ghost" onclick="zExportCSV?.()" style="color:var(--muted)">↓ Zeittracker CSV exportieren</button>
  `;
}

function statsActBreakdown(acts) {
  if (!acts.length) return `<div style="font-size:12px;color:var(--muted);font-style:italic">Keine Daten im Zeitraum</div>`;

  const byAct = {};
  acts.forEach(a=>{ byAct[a.name]=(byAct[a.name]||0)+a.minutes; });
  const total = acts.reduce((s,a)=>s+a.minutes,0);
  const sorted = Object.entries(byAct).sort((a,b)=>b[1]-a[1]);

  return `
    <div class="card">
      <div class="card-title">Zeit nach Aktivität</div>
      ${sorted.map(([name,mins])=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:8px;height:8px;border-radius:50%;background:${zGetColor?.(name)||'#555'};flex-shrink:0"></div>
          <div style="font-size:12px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
          <div style="width:80px;height:5px;background:var(--surface2);border-radius:3px;overflow:hidden;flex-shrink:0">
            <div style="height:100%;background:${zGetColor?.(name)||'#555'};border-radius:3px;width:${Math.round(mins/total*100)}%"></div>
          </div>
          <div style="font-size:11px;color:var(--muted);width:30px;text-align:right;flex-shrink:0">${Math.round(mins/total*100)}%</div>
        </div>`).join('')}
    </div>`;
}

function statsGymTopExercises(sessions) {
  if (!sessions.length) return `<div style="font-size:12px;color:var(--muted);font-style:italic">Keine Trainings im Zeitraum</div>`;

  const bests = {};
  sessions.forEach(s=>{
    (s.exercises||[]).forEach(e=>{
      (e.sets||[]).forEach(set=>{
        if (!bests[e.name]||set.weight>bests[e.name]) bests[e.name]=set.weight;
      });
    });
  });

  const entries = Object.entries(bests).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if (!entries.length) return '';

  return `
    <div class="card">
      <div class="card-title">Beste Gewichte im Zeitraum</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${entries.map(([name,weight])=>`
          <div style="background:var(--surface2);border-radius:10px;padding:10px 12px">
            <div style="font-size:10px;color:var(--muted);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
            <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--accent)">${weight}<span style="font-size:10px;color:var(--muted);font-family:'DM Mono',monospace"> kg</span></div>
          </div>`).join('')}
      </div>
    </div>`;
}
