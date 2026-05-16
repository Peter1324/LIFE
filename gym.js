/* ============================================
   gym.js — Gym Tracker
   Freestyle Training: beliebige Übungen,
   Gewicht + Wiederholungen + Sätze,
   Verlauf pro Übung
   ============================================ */

let gymView = 'home'; // 'home' | 'session' | 'history' | 'exercise-detail'
let gymActiveSession = null; // aktuelles Training
let gymDetailExercise = null; // Übung für Detailansicht

// ===== INIT =====
function initGym() {
  const content = document.getElementById('screen-gym').querySelector('.screen-content');
  if (!content) return;

  content.innerHTML = `
    <div id="gymHome"></div>
    <div id="gymSession" style="display:none"></div>
    <div id="gymHistory" style="display:none"></div>
    <div id="gymExerciseDetail" style="display:none"></div>

    <!-- Übung hinzufügen Sheet -->
    <div class="overlay-bg" id="gymExercisePicker">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">Übung hinzufügen</div>

        <!-- Schnellauswahl bekannte Übungen -->
        <div style="margin-bottom:12px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Schnellauswahl</div>
          <div id="gymKnownExercises" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        </div>

        <!-- Neue Übung -->
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Neue Übung</div>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <input type="text" class="input" id="gymNewExerciseName" placeholder="Übungsname…" style="flex:1">
          <button class="btn" onclick="gymAddCustomExercise()" style="background:var(--accent);color:#0f0f0f;font-family:'Syne',sans-serif;font-weight:800;padding:0 16px;flex-shrink:0">+</button>
        </div>
        <button class="btn btn-ghost" onclick="closeOverlay('gymExercisePicker')">Abbrechen</button>
      </div>
    </div>

    <!-- Satz eintragen Sheet -->
    <div class="overlay-bg" id="gymSetSheet">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title" id="gymSetSheetTitle">Satz eintragen</div>

        <!-- Letztes Mal -->
        <div id="gymLastTime" style="display:none;background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--muted)"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
          <div>
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Sätze</div>
            <input type="number" class="input" id="gymSets" placeholder="3" min="1" max="20" style="text-align:center;font-family:'Syne',sans-serif;font-size:22px;font-weight:800">
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Wiederh.</div>
            <input type="number" class="input" id="gymReps" placeholder="10" min="1" max="100" style="text-align:center;font-family:'Syne',sans-serif;font-size:22px;font-weight:800">
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Gewicht</div>
            <input type="number" class="input" id="gymWeight" placeholder="60" min="0" max="1000" step="0.5" style="text-align:center;font-family:'Syne',sans-serif;font-size:22px;font-weight:800">
          </div>
        </div>
        <div style="font-size:10px;color:var(--muted);text-align:center;margin-bottom:14px">kg</div>

        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" onclick="closeOverlay('gymSetSheet')" style="flex:0 0 auto;padding:14px 16px">Abbrechen</button>
          <button class="btn btn-primary" onclick="gymSaveSet()">Eintragen ✓</button>
        </div>
      </div>
    </div>
  `;

  gymRenderHome();
}

// ===== HOME =====
function gymRenderHome() {
  gymView = 'home';
  gymShowView('gymHome');

  const sessions = DB.gym.getSessions();
  const todaySession = sessions.find(s => isGymToday(s.date));
  const recentSessions = sessions.slice(0, 10);

  document.getElementById('gymHome').innerHTML = `
    <!-- Heutiges Training -->
    ${todaySession ? `
      <div class="card" style="border-color:var(--accent);margin-bottom:12px;cursor:pointer" onclick="gymOpenSession('${todaySession.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--accent)">💪 Training läuft</div>
            <div style="font-size:11px;color:var(--muted);margin-top:3px">${todaySession.exercises?.length||0} Übungen · Heute</div>
          </div>
          <div style="font-size:20px">→</div>
        </div>
      </div>` : `
      <button class="btn btn-primary" onclick="gymStartSession()" style="margin-bottom:16px">
        💪 Training starten
      </button>`
    }

    <!-- Schnellübersicht letzte Trainings -->
    <div style="margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em">Letzte Trainings</div>
        ${recentSessions.length>0?`<button onclick="gymShowHistory()" style="background:none;border:none;color:var(--accent);font-size:11px;cursor:pointer;font-family:'DM Mono',monospace">Alle →</button>`:''}
      </div>

      ${recentSessions.length===0?`
        <div class="empty-state">
          <div class="empty-icon">💪</div>
          <div class="empty-title">Noch kein Training</div>
          <div class="empty-sub">Starte dein erstes Training</div>
        </div>` : `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${recentSessions.slice(0,5).map(s => gymRenderSessionCard(s)).join('')}
        </div>`
      }
    </div>

    <!-- Übungsrekorde -->
    ${gymRenderPersonalBests()}
  `;
}

function gymRenderSessionCard(session) {
  const date = new Date(session.date);
  const isToday = isGymToday(session.date);
  const totalSets = (session.exercises||[]).reduce((sum,e)=>sum+(e.sets||[]).length,0);
  const exercises = (session.exercises||[]).map(e=>e.name).join(', ');

  return `
    <div class="card" style="cursor:pointer;padding:14px" onclick="gymOpenSession('${session.id}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700">${isToday?'Heute':date.toLocaleDateString('de',{weekday:'short',day:'numeric',month:'short'})}</div>
        <div style="font-size:11px;color:var(--muted)">${totalSets} Sätze</div>
      </div>
      <div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${exercises||'Keine Übungen'}</div>
    </div>`;
}

function gymRenderPersonalBests() {
  const sessions = DB.gym.getSessions();
  if (sessions.length < 2) return '';

  // Alle Übungen sammeln und jeweils höchstes Gewicht finden
  const bests = {};
  sessions.forEach(s => {
    (s.exercises||[]).forEach(e => {
      (e.sets||[]).forEach(set => {
        if (!bests[e.name] || set.weight > bests[e.name].weight) {
          bests[e.name] = { weight: set.weight, reps: set.reps, date: s.date };
        }
      });
    });
  });

  const bestEntries = Object.entries(bests).slice(0,6);
  if (!bestEntries.length) return '';

  return `
    <div style="margin-top:8px">
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px">Persönliche Bestleistungen</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${bestEntries.map(([name, best])=>`
          <div class="card" style="padding:12px;cursor:pointer" onclick="gymShowExerciseDetail('${name}')">
            <div style="font-size:10px;color:var(--muted);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
            <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent)">${best.weight}<span style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace"> kg</span></div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${best.reps} Wdh.</div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ===== SESSION =====
function gymStartSession() {
  const session = {
    id: Math.random().toString(36).slice(2),
    date: Date.now(),
    exercises: [],
    note: ''
  };
  DB.gym.addSession(session);
  gymActiveSession = session.id;
  gymOpenSession(session.id);
}

function gymOpenSession(sessionId) {
  gymView = 'session';
  gymActiveSession = sessionId;
  gymShowView('gymSession');
  gymRenderSession();
}

function gymRenderSession() {
  const el = document.getElementById('gymSession');
  if (!el) return;

  const sessions = DB.gym.getSessions();
  const session = sessions.find(s=>s.id===gymActiveSession);
  if (!session) return;

  const date = new Date(session.date);
  const isToday = isGymToday(session.date);
  const totalVolume = (session.exercises||[]).reduce((sum,e)=>
    sum+(e.sets||[]).reduce((s2,set)=>s2+(set.weight*set.reps*set.sets),0),0
  );

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button class="btn btn-icon" onclick="gymRenderHome()">←</button>
      <div style="flex:1">
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;letter-spacing:-0.5px">
          ${isToday?'Training heute':date.toLocaleDateString('de',{weekday:'long',day:'numeric',month:'long'})}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">
          Volumen: ${Math.round(totalVolume)} kg total
        </div>
      </div>
      ${isToday?`<button class="btn btn-icon" onclick="gymFinishSession()" style="background:var(--accent);color:#0f0f0f;border-color:var(--accent);font-size:11px;width:auto;padding:0 12px">Fertig</button>`:''}
    </div>

    <!-- Übungen -->
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px" id="gymExerciseList">
      ${(session.exercises||[]).length===0?`
        <div class="empty-state" style="padding:32px 16px">
          <div class="empty-icon">🏋️</div>
          <div class="empty-title">Noch keine Übungen</div>
          <div class="empty-sub">Füge deine erste Übung hinzu</div>
        </div>` : (session.exercises||[]).map((ex,exIdx) => gymRenderExerciseRow(ex, exIdx, session, isToday)).join('')
      }
    </div>

    ${isToday?`<button class="btn btn-ghost" onclick="gymOpenExercisePicker()">+ Übung hinzufügen</button>`:''}
  `;
}

function gymRenderExerciseRow(ex, exIdx, session, isToday) {
  // Letztes Mal diese Übung
  const sessions = DB.gym.getSessions();
  const prevSession = sessions.find(s=>s.id!==session.id&&(s.exercises||[]).some(e=>e.name===ex.name));
  const prevEx = prevSession?.exercises?.find(e=>e.name===ex.name);
  const prevBest = prevEx?.sets?.reduce((best,set)=>(!best||set.weight>best.weight)?set:best, null);

  const currentBest = (ex.sets||[]).reduce((best,set)=>(!best||set.weight>best.weight)?set:best, null);
  const improved = currentBest && prevBest && currentBest.weight > prevBest.weight;
  const same = currentBest && prevBest && currentBest.weight === prevBest.weight;

  return `
    <div class="card" style="padding:14px">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;cursor:pointer" onclick="gymShowExerciseDetail('${ex.name}')">${ex.name}</div>
          ${improved?'<span style="font-size:12px">📈</span>':same?'<span style="font-size:12px">➡️</span>':prevBest?'<span style="font-size:12px">📉</span>':''}
        </div>
        ${isToday?`<button onclick="gymRemoveExercise(${exIdx})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:4px">✕</button>`:''}
      </div>

      <!-- Vergleich mit letztem Mal -->
      ${prevBest?`
        <div style="font-size:10px;color:var(--muted);margin-bottom:8px">
          Letztes Mal: <span style="color:var(--text)">${prevBest.weight} kg × ${prevBest.reps} Wdh. × ${prevBest.sets} Sätze</span>
        </div>`:''
      }

      <!-- Eingetragene Sätze -->
      ${(ex.sets||[]).length>0?`
        <div style="margin-bottom:8px">
          <div style="display:grid;grid-template-columns:auto 1fr 1fr 1fr auto;gap:4px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;padding:0 4px">
            <div>#</div><div>Sätze</div><div>Wdh.</div><div>kg</div><div></div>
          </div>
          ${(ex.sets||[]).map((set,setIdx)=>`
            <div style="display:grid;grid-template-columns:auto 1fr 1fr 1fr auto;gap:4px;align-items:center;padding:6px 4px;border-radius:8px;background:var(--surface2);margin-bottom:3px">
              <div style="font-size:11px;color:var(--muted);width:16px">${setIdx+1}</div>
              <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700">${set.sets}</div>
              <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700">${set.reps}</div>
              <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--accent)">${set.weight}</div>
              ${isToday?`<button onclick="gymRemoveSet(${exIdx},${setIdx})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px;padding:2px">✕</button>`:'<div></div>'}
            </div>`).join('')}
        </div>`:''
      }

      <!-- Satz hinzufügen -->
      ${isToday?`
        <button onclick="gymOpenSetSheet(${exIdx})"
          style="width:100%;padding:9px;background:transparent;border:1px dashed var(--border);border-radius:8px;color:var(--muted);font-family:'DM Mono',monospace;font-size:12px;cursor:pointer">
          + Satz eintragen
        </button>`:''
      }
    </div>`;
}

// ===== ÜBUNG PICKER =====
function gymOpenExercisePicker() {
  // Bekannte Übungen aus vergangenen Sessions
  const sessions = DB.gym.getSessions();
  const knownNames = [...new Set(sessions.flatMap(s=>(s.exercises||[]).map(e=>e.name)))];

  const el = document.getElementById('gymKnownExercises');
  if (el) {
    el.innerHTML = knownNames.length > 0
      ? knownNames.map(name=>`
          <button class="chip" onclick="gymPickExercise('${name}')" style="margin:0">${name}</button>
        `).join('')
      : '<div style="font-size:12px;color:var(--muted)">Noch keine — füge eine neue hinzu</div>';
  }

  document.getElementById('gymNewExerciseName').value = '';
  openOverlay('gymExercisePicker');
}

function gymPickExercise(name) {
  closeOverlay('gymExercisePicker');
  gymAddExerciseToSession(name);
}

function gymAddCustomExercise() {
  const name = document.getElementById('gymNewExerciseName')?.value.trim();
  if (!name) { showToast('Bitte Name eingeben'); return; }
  closeOverlay('gymExercisePicker');
  gymAddExerciseToSession(name);
}

function gymAddExerciseToSession(name) {
  const sessions = DB.gym.getSessions();
  const session = sessions.find(s=>s.id===gymActiveSession);
  if (!session) return;
  if (!session.exercises) session.exercises = [];
  if (session.exercises.find(e=>e.name===name)) { showToast('Übung schon drin'); return; }
  session.exercises.push({ name, sets:[] });
  DB.gym.saveSessions(sessions);
  gymRenderSession();
  showToast(`${name} hinzugefügt`);
}

function gymRemoveExercise(exIdx) {
  const sessions = DB.gym.getSessions();
  const session = sessions.find(s=>s.id===gymActiveSession);
  if (!session) return;
  session.exercises.splice(exIdx,1);
  DB.gym.saveSessions(sessions);
  gymRenderSession();
}

// ===== SATZ EINTRAGEN =====
let gymCurrentExIdx = null;

function gymOpenSetSheet(exIdx) {
  gymCurrentExIdx = exIdx;
  const sessions = DB.gym.getSessions();
  const session = sessions.find(s=>s.id===gymActiveSession);
  const ex = session?.exercises?.[exIdx];
  if (!ex) return;

  document.getElementById('gymSetSheetTitle').textContent = ex.name;

  // Letztes Mal
  const prevSession = sessions.find(s=>s.id!==gymActiveSession&&(s.exercises||[]).some(e=>e.name===ex.name));
  const prevEx = prevSession?.exercises?.find(e=>e.name===ex.name);
  const prevBest = prevEx?.sets?.reduce((best,set)=>(!best||set.weight>best.weight)?set:best,null);
  const lastEl = document.getElementById('gymLastTime');
  if (lastEl) {
    if (prevBest) {
      lastEl.style.display = 'block';
      lastEl.innerHTML = `🕐 Letztes Mal: <strong style="color:var(--text)">${prevBest.sets} × ${prevBest.reps} Wdh. × ${prevBest.weight} kg</strong>`;
    } else {
      lastEl.style.display = 'none';
    }
  }

  // Letzte Eingabe vorausfüllen
  const lastSet = ex.sets?.[ex.sets.length-1];
  document.getElementById('gymSets').value = lastSet?.sets||'';
  document.getElementById('gymReps').value = lastSet?.reps||'';
  document.getElementById('gymWeight').value = lastSet?.weight||'';

  openOverlay('gymSetSheet');
  setTimeout(()=>document.getElementById('gymSets')?.focus(),100);
}

function gymSaveSet() {
  const sets = parseInt(document.getElementById('gymSets')?.value);
  const reps = parseInt(document.getElementById('gymReps')?.value);
  const weight = parseFloat(document.getElementById('gymWeight')?.value);

  if (!sets||!reps||isNaN(weight)) { showToast('Bitte alle Felder ausfüllen'); return; }

  const sessions = DB.gym.getSessions();
  const session = sessions.find(s=>s.id===gymActiveSession);
  if (!session?.exercises?.[gymCurrentExIdx]) return;

  session.exercises[gymCurrentExIdx].sets.push({ sets, reps, weight, ts: Date.now() });
  DB.gym.saveSessions(sessions);
  closeOverlay('gymSetSheet');
  gymRenderSession();
  showToast('Satz eingetragen ✓');
}

function gymRemoveSet(exIdx, setIdx) {
  const sessions = DB.gym.getSessions();
  const session = sessions.find(s=>s.id===gymActiveSession);
  if (!session?.exercises?.[exIdx]) return;
  session.exercises[exIdx].sets.splice(setIdx,1);
  DB.gym.saveSessions(sessions);
  gymRenderSession();
}

function gymFinishSession() {
  gymRenderHome();
  showToast('Training gespeichert 💪');
}

// ===== HISTORY =====
function gymShowHistory() {
  gymView = 'history';
  gymShowView('gymHistory');

  const sessions = DB.gym.getSessions();
  document.getElementById('gymHistory').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button class="btn btn-icon" onclick="gymRenderHome()">←</button>
      <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.5px">Alle Trainings</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${sessions.length===0?`<div class="empty-state"><div class="empty-icon">💪</div><div class="empty-title">Noch keine Trainings</div></div>`
        : sessions.map(s=>gymRenderSessionCard(s)).join('')}
    </div>
  `;
}

// ===== ÜBUNG DETAIL / VERLAUF =====
function gymShowExerciseDetail(exerciseName) {
  gymView = 'exercise-detail';
  gymDetailExercise = exerciseName;
  gymShowView('gymExerciseDetail');

  const sessions = DB.gym.getSessions();
  // Alle Sätze dieser Übung aus allen Sessions
  const history = sessions
    .filter(s=>(s.exercises||[]).some(e=>e.name===exerciseName))
    .map(s=>({
      date: s.date,
      sets: s.exercises.find(e=>e.name===exerciseName)?.sets||[]
    }))
    .reverse(); // älteste zuerst für Grafik

  const allWeights = history.map(h=>Math.max(...(h.sets.map(s=>s.weight)||[0])));
  const maxWeight = Math.max(...allWeights, 1);
  const minWeight = Math.min(...allWeights.filter(w=>w>0), 0);

  const el = document.getElementById('gymExerciseDetail');
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button class="btn btn-icon" onclick="gymBack()">←</button>
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;letter-spacing:-0.5px">${exerciseName}</div>
    </div>

    ${history.length < 2 ? `
      <div class="card" style="text-align:center;padding:24px">
        <div style="font-size:12px;color:var(--muted)">Mindestens 2 Trainings nötig für den Verlauf</div>
      </div>` : `

      <!-- Verlaufsgrafik -->
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Gewichtsverlauf (Max. pro Training)</div>
        <div style="height:120px;display:flex;align-items:flex-end;gap:4px;padding-top:8px">
          ${allWeights.map((w,i)=>{
            const pct = maxWeight>0?((w-minWeight)/(maxWeight-minWeight||1))*100:0;
            const date = new Date(history[i].date);
            const isLast = i===allWeights.length-1;
            return `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                <div style="font-size:9px;color:${isLast?'var(--accent)':'var(--muted)'}">${w}kg</div>
                <div style="width:100%;background:${isLast?'var(--accent)':'var(--surface3)'};border-radius:4px 4px 0 0;min-height:4px" style="height:${Math.max(pct,4)}%">
                  <div style="height:${Math.max(pct,4)}%;min-height:4px;background:${isLast?'var(--accent)':'#5a7a3a'};border-radius:4px 4px 0 0"></div>
                </div>
                <div style="font-size:8px;color:var(--muted);transform:rotate(-45deg);white-space:nowrap">${date.toLocaleDateString('de',{day:'numeric',month:'short'})}</div>
              </div>`;
          }).join('')}
        </div>
      </div>`
    }

    <!-- Alle Einträge -->
    <div>
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px">Alle Einträge</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${[...history].reverse().map(h=>`
          <div class="card" style="padding:12px">
            <div style="font-size:11px;color:var(--muted);margin-bottom:8px">
              ${new Date(h.date).toLocaleDateString('de',{weekday:'long',day:'numeric',month:'long'})}
            </div>
            ${h.sets.map((set,i)=>`
              <div style="display:flex;align-items:center;gap:8px;padding:5px 0;${i<h.sets.length-1?'border-bottom:1px solid var(--border)':''}">
                <div style="font-size:10px;color:var(--muted);width:16px">${i+1}</div>
                <div style="font-size:13px;flex:1">${set.sets} Sätze × ${set.reps} Wdh.</div>
                <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--accent)">${set.weight} kg</div>
              </div>`).join('')}
          </div>`).join('')}
      </div>
    </div>
  `;
}

function gymBack() {
  if (gymView==='exercise-detail') {
    if (gymActiveSession) gymOpenSession(gymActiveSession);
    else gymRenderHome();
  } else {
    gymRenderHome();
  }
}

// ===== HILFSFUNKTIONEN =====
function gymShowView(activeId) {
  ['gymHome','gymSession','gymHistory','gymExerciseDetail'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.style.display = id===activeId?'block':'none';
  });
}

function isGymToday(ts) {
  return new Date(ts).toDateString() === new Date().toDateString();
}
