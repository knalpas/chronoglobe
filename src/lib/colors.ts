/**
 * Colouring of polities. Colours are assigned deterministically from the name
 * of the *ruling power* (SUBJECTO, falling back to NAME) so that the same
 * empire keeps its colour as the slider moves and colonies share their
 * metropole's hue — the convention of classic political atlases.
 */

/** Muted, print-atlas palette. Order matters: adjacent indices contrast well. */
export const PALETTE = [
  '#d9a066', // terracotta
  '#8fb28a', // sage
  '#c98b8b', // dusty rose
  '#8ea6c4', // steel blue
  '#d4c27a', // ochre
  '#a98ec2', // lavender
  '#7fb8b0', // teal
  '#c9a06a', // tan
  '#b08a7a', // clay
  '#9db07f', // olive
  '#d19a7c', // coral
  '#87a0a8', // slate
  '#c7b48a', // sand
  '#a3b8d0', // pale blue
  '#b9a2b8', // mauve
  '#a8b89a', // moss
];

/** Hand-picked colours for the most recognisable powers, for continuity. */
const OVERRIDES: Record<string, string> = {
  'Roman Republic': '#c0605a',
  'Roman Empire': '#c0605a',
  'Western Roman Empire': '#c0605a',
  'Eastern Roman Empire': '#b27083',
  'Byzantine Empire': '#b27083',
  Rome: '#c0605a',
  'Achaemenid Empire': '#7e9fc6',
  'Sasanian Empire': '#7e9fc6',
  'Parthian Empire': '#7e9fc6',
  'Persia': '#7e9fc6',
  'Safavid Empire': '#7e9fc6',
  'Iran': '#7e9fc6',
  'Han Empire': '#d8b25c',
  'Tang Empire': '#d8b25c',
  'Song Empire': '#d8b25c',
  'Ming Empire': '#d8b25c',
  'Qing Empire': '#d8b25c',
  'Manchu Empire': '#d8b25c',
  China: '#d8b25c',
  "People's Republic of China": '#d8b25c',
  'Mongol Empire': '#b58a5a',
  'Ottoman Empire': '#8f9a5c',
  'Umayyad Caliphate': '#7fb08a',
  'Abbasid Caliphate': '#7fb08a',
  'Rashidun Caliphate': '#7fb08a',
  'Holy Roman Empire': '#c9a86a',
  'Frankish Kingdom': '#c9a86a',
  'Carolingian Empire': '#c9a86a',
  France: '#8ea6c4',
  'United Kingdom': '#d98b8b',
  'United Kingdom of Great Britain and Ireland': '#d98b8b',
  UK: '#d98b8b',
  England: '#d98b8b',
  'Great Britain': '#d98b8b',
  Spain: '#e0b86a',
  'Spanish Habsburg': '#e0b86a',
  Portugal: '#8fb28a',
  Netherlands: '#e2a066',
  Russia: '#a8c39a',
  'Russian Empire': '#a8c39a',
  USSR: '#c97b6a',
  'Soviet Union': '#c97b6a',
  'United States': '#9fb7d3',
  USA: '#9fb7d3',
  'Empire of Japan': '#d9a3a3',
  'Imperial Japan': '#d9a3a3',
  Japan: '#d9a3a3',
  Germany: '#a9a9c2',
  Prussia: '#a9a9c2',
  'German Empire': '#a9a9c2',
  'Mughal Empire': '#b39ac6',
  'Maurya Empire': '#b39ac6',
  'Gupta Empire': '#b39ac6',
  'British Raj': '#d98b8b',
  India: '#e0a070',
  'Inca Empire': '#c9a06a',
  'Aztec Empire': '#b58a5a',
  Egypt: '#dcc27f',
  'Ancient Egypt': '#dcc27f',
  'Kingdom of Egypt': '#dcc27f',
};

const ALIASES: Record<string, string> = {
  UK: 'United Kingdom',
  'United Kingdom of Great Britain and Ireland': 'United Kingdom',
  England: 'United Kingdom',
  'Great Britain': 'United Kingdom',
  'Spanish Habsburg': 'Spain',
  USA: 'United States',
  'Soviet Union': 'USSR',
};

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function colorForPower(power: string): string {
  const key = ALIASES[power] ?? power;
  if (OVERRIDES[key]) return OVERRIDES[key];
  return PALETTE[hashString(key) % PALETTE.length];
}

/** Colour for regions that are cultural zones rather than states. */
export const CULTURE_FILL = '#d8ccb3';
/** Colour for land with no attributed polity or culture. */
export const UNCLAIMED_FILL = '#e6dcc6';

const CULTURE_RE =
  /hunter|gatherer|culture|farmers?|peoples?|pastoral|nomad|tribes?|foraging|fishers?|fichers|herders?|aboriginal|paleo|neolithic|hunters|cultures|city-states|kingdoms|khanates|chiefdoms|states$/i;

export type RegionKind = 'polity' | 'culture' | 'unclaimed';

export function classifyRegion(name: string | undefined, precision: number): RegionKind {
  if (!name) return 'unclaimed';
  if (CULTURE_RE.test(name) && precision <= 1) return 'culture';
  return 'polity';
}

/** Darken a hex colour by a factor (0–1) — used for label halos and outlines. */
export function darken(hex: string, amount = 0.35): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `rgb(${r},${g},${b})`;
}
