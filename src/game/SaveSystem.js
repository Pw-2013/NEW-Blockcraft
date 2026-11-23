// localStorage-based save system.
export class SaveSystem {
  constructor() { this.key = 'grandcity_save_v1'; this.settingsKey = 'grandcity_settings_v1'; }

  save(data) {
    try { localStorage.setItem(this.key, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }
  load() {
    try { const r = localStorage.getItem(this.key); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  saveSettings(s) { try { localStorage.setItem(this.settingsKey, JSON.stringify(s)); } catch(e){} }
  loadSettings() {
    try { const r = localStorage.getItem(this.settingsKey); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  clear() { try { localStorage.removeItem(this.key); } catch(e){} }
}
