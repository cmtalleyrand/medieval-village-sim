import { CoatOfArms } from './types';

export const DEFAULT_COAT: CoatOfArms = {
  shieldShape: 'heater',
  field: { division: 'plain', tinctures: ['gules', 'argent'], count: 6 },
  ordinary: { type: 'none', tincture: 'or' },
  charge: { type: 'lion', attitude: 'rampant', tincture: 'or', arrangement: 'single', position: 'center', scale: 0.68 },
  externalOrnaments: { motto: 'Fortitudine et Honore', helm: true, supporters: false },
};
