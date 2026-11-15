import { CONFIG } from '../config.js';
import { cleanName, safeColor } from '../core/utils.js';

/** The player's name, colour and match length, remembered on this tablet. */
export const Profile = {
  load(storage = globalThis.localStorage) {
    let saved = {};
    try { saved = JSON.parse(storage.getItem(CONFIG.storageKey)) || {}; } catch { /* storage unavailable */ }
    return {
      name: cleanName(saved.name, CONFIG.defaultNames[0]),
      color: safeColor(saved.color, CONFIG.colors[0]),
      minutes: CONFIG.match.durations.includes(saved.minutes) ? saved.minutes : CONFIG.match.defaultDuration,
    };
  },

  save(profile, storage = globalThis.localStorage) {
    try { storage.setItem(CONFIG.storageKey, JSON.stringify(profile)); } catch { /* storage unavailable */ }
  },
};
