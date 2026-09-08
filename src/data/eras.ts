import { BC, MAX_YEAR, MIN_YEAR } from '../lib/time';

export interface Era {
  id: string;
  name: string;
  short: string;
  start: number;
  end: number; // inclusive
  color: string;
}

/**
 * Broad periodisation used for the timeline bands. Boundaries are conventional
 * and necessarily Eurasia-centric; they are visual guides, not hard facts.
 */
export const ERAS: Era[] = [
  { id: 'neolithic', name: 'Late Neolithic & Copper Age', short: 'Neolithic', start: MIN_YEAR, end: BC(3301), color: '#6b7a5e' },
  { id: 'bronze', name: 'Bronze Age', short: 'Bronze Age', start: BC(3300), end: BC(1201), color: '#a7743a' },
  { id: 'iron', name: 'Early Iron Age', short: 'Iron Age', start: BC(1200), end: BC(551), color: '#7d6b5d' },
  { id: 'classical', name: 'Classical Antiquity', short: 'Classical', start: BC(550), end: 476, color: '#8b5e83' },
  { id: 'earlymed', name: 'Late Antiquity & Early Middle Ages', short: 'Early Medieval', start: 477, end: 999, color: '#5d6f8b' },
  { id: 'highmed', name: 'High & Late Middle Ages', short: 'Medieval', start: 1000, end: 1491, color: '#4e7f86' },
  { id: 'earlymodern', name: 'Early Modern Period', short: 'Early Modern', start: 1492, end: 1788, color: '#8a6d3b' },
  { id: 'c19', name: 'Age of Revolutions & Empire', short: '19th c.', start: 1789, end: 1913, color: '#7a5a4a' },
  { id: 'c20', name: 'World Wars & Cold War', short: '20th c.', start: 1914, end: 1990, color: '#5b6d7c' },
  { id: 'contemporary', name: 'Contemporary World', short: 'Contemporary', start: 1991, end: MAX_YEAR, color: '#4f7a6b' },
];

export function eraFor(year: number): Era {
  return ERAS.find((e) => year >= e.start && year <= e.end) ?? ERAS[ERAS.length - 1];
}
