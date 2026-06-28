// ============================================================
// services/programs.js — génération de programmes thématiques
// (Phase 4 — chantier 3). Source : POIs de la destination +
// incontournables Routard + gastronomie + heuristiques par thème.
// ============================================================

const THEMES = [
  { key: 'culture',    label: '🏛️ Culture' },
  { key: 'gastronomie',label: '🍽️ Gastronomie' },
  { key: 'nature',     label: '🌿 Nature' },
  { key: 'plage',      label: '🏖️ Plage' },
  { key: 'randonnee',  label: '🥾 Randonnée' },
  { key: 'famille',    label: '👨‍👩‍👧 Famille' },
  { key: 'aventure',   label: '🧗 Aventure' },
  { key: 'detente',    label: '😎 Détente' },
];

const DURATIONS = [3, 5, 7, 10];

const THEME_TYPES = {
  culture:    ['culture', 'histoire', 'art', 'ville'],
  gastronomie:['gastronomie', 'ville', 'culture'],
  nature:     ['nature', 'randonnee', 'volcan', 'fjords'],
  plage:      ['plage', 'mer', 'ile', 'detente'],
  randonnee:  ['randonnee', 'nature', 'volcan'],
  famille:    ['detente', 'plage', 'culture', 'nature'],
  aventure:   ['randonnee', 'excursion', 'nature', 'volcan'],
  detente:    ['detente', 'plage', 'mer'],
};

const DUR = {
  culture: 120, histoire: 120, art: 120, ville: 90, nature: 180, randonnee: 210,
  volcan: 210, fjords: 180, plage: 150, mer: 120, ile: 210, excursion: 210,
  gastronomie: 90, detente: 90, velo: 120, pub: 90, biere: 90, streetart: 90,
};
const ico = t => (window.TYPE_ICONS && window.TYPE_ICONS[t]) || '📍';
const cap = (v, max) => Math.min(v, max);

/**
 * Génère un programme jour par jour.
 * @returns {{hstart:number, hend:number, days:number, theme:string, blocks:Array}}
 */
function generateProgram(dest, days, theme) {
  const order = THEME_TYPES[theme] || [];
  const pois = (dest.pois || []).slice().sort((a, b) => {
    const ra = order.indexOf(a.type), rb = order.indexOf(b.type);
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb);
  });
  const extra = (dest.routard?.incontournables || []).map(t => ({
    nom: t.split('(')[0].split(':')[0].trim(), type: 'culture',
  }));
  let pool = pois.concat(extra);
  if (!pool.length) pool = [{ nom: 'Exploration libre du quartier', type: 'detente' }];

  const firstGastro = (dest.gastronomie && dest.gastronomie[0]) ? ` — ${dest.gastronomie[0]}` : '';
  const chillTheme = ['detente', 'famille', 'plage'].includes(theme);
  const blocks = [];
  let pi = 0;
  const take = () => pool[pi++ % pool.length];

  for (let d = 0; d < days; d++) {
    const isChill = chillTheme ? (d % 2 === 1) : (days >= 7 && d > 0 && d % 3 === 2);
    blocks.push({ d, h: 8, m: 30, dur: 45, type: 'repas', emoji: '🥐', label: 'Petit-déjeuner' });

    if (isChill) {
      blocks.push({ d, h: 10, m: 0, dur: 150, type: 'plage', emoji: '🏖️', label: 'Détente — plage / piscine', chill: true });
      blocks.push({ d, h: 13, m: 0, dur: 90, type: 'repas', emoji: '🍽️', label: 'Déjeuner tranquille' });
      blocks.push({ d, h: 15, m: 0, dur: 120, type: 'detente', emoji: '😎', label: 'Balade / temps libre', chill: true });
      blocks.push({ d, h: 20, m: 0, dur: 90, type: 'repas', emoji: '🍷', label: 'Dîner' + firstGastro });
      continue;
    }

    const a1 = take();
    blocks.push({ d, h: 9, m: 30, dur: cap(DUR[a1.type] || 120, 210), type: a1.type, emoji: ico(a1.type), label: a1.nom });
    blocks.push({ d, h: 13, m: 0, dur: 75, type: 'repas', emoji: '🍽️', label: 'Déjeuner' + (d === 0 ? firstGastro : '') });
    const a2 = take();
    blocks.push({ d, h: 15, m: 0, dur: cap(DUR[a2.type] || 120, 210), type: a2.type, emoji: ico(a2.type), label: a2.nom });
    blocks.push({ d, h: 20, m: 0, dur: 90, type: 'repas', emoji: '🍷', label: 'Dîner' });
  }
  return { hstart: 8, hend: 23, days, theme, blocks };
}
