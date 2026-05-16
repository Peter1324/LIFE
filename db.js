/* ============================================
   db.js — Datenbankschicht
   Supabase wenn verfügbar, sonst localStorage
   ============================================ */

// ===== SUPABASE CONFIG =====
// TODO: Wenn Supabase bereit ist, hier eintragen:
// const SUPABASE_URL = 'https://DEIN-PROJEKT.supabase.co';
// const SUPABASE_KEY = 'DEIN-ANON-KEY';
const SUPABASE_READY = false; // auf true setzen wenn Supabase eingerichtet

// ===== LOKALER SPEICHER (Fallback bis Supabase angebunden) =====
// Alle Daten in localStorage, strukturiert nach Modulen

const DB = {

  // ---- ZEITTRACKER ----
  zeit: {
    getEntries() {
      const raw = localStorage.getItem('los_zeit_entries');
      return raw ? JSON.parse(raw) : [];
    },
    saveEntries(entries) {
      localStorage.setItem('los_zeit_entries', JSON.stringify(entries));
    },
    addEntry(entry) {
      const entries = this.getEntries();
      const idx = entries.findIndex(e => e.slotTs === entry.slotTs);
      if (idx >= 0) entries[idx] = entry;
      else entries.unshift(entry);
      this.saveEntries(entries);
    },
    deleteEntry(slotTs) {
      const entries = this.getEntries().filter(e => e.slotTs !== slotTs);
      this.saveEntries(entries);
    }
  },

  // ---- GTD ----
  gtd: {
    getItems() {
      const raw = localStorage.getItem('los_gtd_items');
      return raw ? JSON.parse(raw) : [];
    },
    saveItems(items) {
      localStorage.setItem('los_gtd_items', JSON.stringify(items));
    },
    addItem(item) {
      const items = this.getItems();
      item.id = item.id || Math.random().toString(36).slice(2);
      item.createdAt = item.createdAt || Date.now();
      items.unshift(item);
      this.saveItems(items);
      return item;
    },
    updateItem(id, updates) {
      const items = this.getItems();
      const idx = items.findIndex(i => i.id === id);
      if (idx >= 0) { items[idx] = { ...items[idx], ...updates }; this.saveItems(items); }
    },
    deleteItem(id) {
      this.saveItems(this.getItems().filter(i => i.id !== id));
    },
    getProjects() {
      const raw = localStorage.getItem('los_gtd_projects');
      return raw ? JSON.parse(raw) : [];
    },
    saveProjects(projects) {
      localStorage.setItem('los_gtd_projects', JSON.stringify(projects));
    },
    addProject(project) {
      const projects = this.getProjects();
      project.id = project.id || Math.random().toString(36).slice(2);
      project.createdAt = Date.now();
      projects.unshift(project);
      this.saveProjects(projects);
      return project;
    }
  },

  // ---- GYM ----
  gym: {
    getSessions() {
      const raw = localStorage.getItem('los_gym_sessions');
      return raw ? JSON.parse(raw) : [];
    },
    saveSessions(sessions) {
      localStorage.setItem('los_gym_sessions', JSON.stringify(sessions));
    },
    addSession(session) {
      const sessions = this.getSessions();
      session.id = session.id || Math.random().toString(36).slice(2);
      session.date = session.date || Date.now();
      sessions.unshift(session);
      this.saveSessions(sessions);
      return session;
    },
    getExercises() {
      const raw = localStorage.getItem('los_gym_exercises');
      return raw ? JSON.parse(raw) : [];
    },
    saveExercises(exercises) {
      localStorage.setItem('los_gym_exercises', JSON.stringify(exercises));
    },
    addExercise(name) {
      const exercises = this.getExercises();
      if (!exercises.find(e => e.name === name)) {
        exercises.push({ id: Math.random().toString(36).slice(2), name });
        this.saveExercises(exercises);
      }
    }
  },

  // ---- EXPORT (alle Daten) ----
  exportAll() {
    const data = {
      zeitEntries: this.zeit.getEntries(),
      gtdItems: this.gtd.getItems(),
      gtdProjects: this.gtd.getProjects(),
      gymSessions: this.gym.getSessions(),
      gymExercises: this.gym.getExercises(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos_backup_${new Date().toLocaleDateString('de')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exportiert ✓');
  }

};
