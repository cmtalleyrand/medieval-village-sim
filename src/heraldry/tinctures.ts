import { Tincture } from './types';

export const tinctureClasses: Record<Tincture, 'metal' | 'colour' | 'fur'> = {
  or: 'metal',
  argent: 'metal',
  gules: 'colour',
  azure: 'colour',
  sable: 'colour',
  vert: 'colour',
  purpure: 'colour',
  ermine: 'fur',
  vair: 'fur',
};

export const tinctureLabels: Record<Tincture, string> = {
  or: 'Or',
  argent: 'Argent',
  gules: 'Gules',
  azure: 'Azure',
  sable: 'Sable',
  vert: 'Vert',
  purpure: 'Purpure',
  ermine: 'Ermine',
  vair: 'Vair',
};

export const tinctureFills: Record<Tincture, string> = {
  or: '#f1c64b',
  argent: '#f8f4df',
  gules: '#b51f2e',
  azure: '#1f5fae',
  sable: '#151515',
  vert: '#28784a',
  purpure: '#6f3a8f',
  ermine: 'url(#heraldry-ermine)',
  vair: 'url(#heraldry-vair)',
};

export const tinctureOptions = Object.keys(tinctureLabels) as Tincture[];
