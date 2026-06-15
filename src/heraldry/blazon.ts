import { CoatOfArms, Field, Tincture } from './types';
import { tinctureLabels } from './tinctures';

const divisionLabels: Record<Field['division'], string> = {
  plain: '',
  per_pale: 'Per pale',
  per_fess: 'Per fess',
  per_bend: 'Per bend',
  per_bend_sinister: 'Per bend sinister',
  quarterly: 'Quarterly',
  per_saltire: 'Per saltire',
  barry: 'Barry',
  paly: 'Paly',
  chequy: 'Chequy',
};

const ordinaryLabels: Record<string, string> = {
  chief: 'a chief', pale: 'a pale', fess: 'a fess', bend: 'a bend', bend_sinister: 'a bend sinister', chevron: 'a chevron', cross: 'a cross', saltire: 'a saltire', bordure: 'a bordure', canton: 'a canton', pile: 'a pile',
};

const chargeLabels: Record<string, string> = {
  lion: 'lion', eagle: 'eagle', fleur_de_lis: 'fleur-de-lis', crosslet: 'crosslet', mullet: 'mullet', crescent: 'crescent', tower: 'tower', sword: 'sword', rose: 'rose', escallop: 'escallop',
};

function tinctures(values: Tincture[]) {
  return values.map((value) => tinctureLabels[value]).join(' and ');
}

export function blazonField(field: Field) {
  if (field.division === 'plain') return tinctureLabels[field.tinctures[0]];
  const count = ['barry', 'paly'].includes(field.division) ? ` of ${field.count}` : '';
  return `${divisionLabels[field.division]}${count} ${tinctures(field.tinctures)}`;
}

export function generateBlazon(coat: CoatOfArms) {
  const phrases = [blazonField(coat.field)];
  if (coat.ordinary.type !== 'none') phrases.push(`${ordinaryLabels[coat.ordinary.type]} ${tinctureLabels[coat.ordinary.tincture]}`);
  const charge = coat.charge;
  const count = { single: 'a', two: 'two', three: 'three', three_two_one: 'six' }[charge.arrangement];
  const attitude = charge.attitude === 'default' ? '' : ` ${charge.attitude}`;
  phrases.push(`${count} ${chargeLabels[charge.type]}${attitude} ${tinctureLabels[charge.tincture]}`);
  return `${phrases.join(', ')}.`;
}
