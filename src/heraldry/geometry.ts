import { FieldDivision, ShieldShape } from './types';

export function shieldPath(shape: ShieldShape) {
  if (shape === 'french') return 'M20 12 H180 V114 C180 164 142 188 100 196 C58 188 20 164 20 114 Z';
  if (shape === 'iberian') return 'M20 12 H180 V118 C180 150 146 184 100 196 C54 184 20 150 20 118 Z';
  if (shape === 'lozenge') return 'M100 8 L188 100 L100 196 L12 100 Z';
  return 'M20 12 L180 12 L180 90 C180 150 138 182 100 196 C62 182 20 150 20 90 Z';
}

export function fieldShapes(division: FieldDivision, count: number) {
  if (division === 'plain') return [{ points: '0,0 200,0 200,200 0,200', tinctureIndex: 0 }];
  if (division === 'per_pale') return [{ points: '0,0 100,0 100,200 0,200', tinctureIndex: 0 }, { points: '100,0 200,0 200,200 100,200', tinctureIndex: 1 }];
  if (division === 'per_fess') return [{ points: '0,0 200,0 200,100 0,100', tinctureIndex: 0 }, { points: '0,100 200,100 200,200 0,200', tinctureIndex: 1 }];
  if (division === 'per_bend') return [{ points: '0,0 200,0 0,200', tinctureIndex: 0 }, { points: '200,0 200,200 0,200', tinctureIndex: 1 }];
  if (division === 'per_bend_sinister') return [{ points: '0,0 200,0 200,200', tinctureIndex: 0 }, { points: '0,0 200,200 0,200', tinctureIndex: 1 }];
  if (division === 'quarterly') return [
    { points: '0,0 100,0 100,100 0,100', tinctureIndex: 0 }, { points: '100,0 200,0 200,100 100,100', tinctureIndex: 1 },
    { points: '0,100 100,100 100,200 0,200', tinctureIndex: 1 }, { points: '100,100 200,100 200,200 100,200', tinctureIndex: 0 },
  ];
  if (division === 'per_saltire') return [
    { points: '0,0 100,100 200,0', tinctureIndex: 0 }, { points: '200,0 100,100 200,200', tinctureIndex: 1 },
    { points: '200,200 100,100 0,200', tinctureIndex: 0 }, { points: '0,200 100,100 0,0', tinctureIndex: 1 },
  ];
  if (division === 'barry') return Array.from({ length: count }, (_, i) => ({ points: `0,${(200 / count) * i} 200,${(200 / count) * i} 200,${(200 / count) * (i + 1)} 0,${(200 / count) * (i + 1)}`, tinctureIndex: i % 2 }));
  if (division === 'paly') return Array.from({ length: count }, (_, i) => ({ points: `${(200 / count) * i},0 ${(200 / count) * (i + 1)},0 ${(200 / count) * (i + 1)},200 ${(200 / count) * i},200`, tinctureIndex: i % 2 }));
  const cell = 200 / count;
  return Array.from({ length: count * count }, (_, i) => {
    const x = i % count;
    const y = Math.floor(i / count);
    return { points: `${x * cell},${y * cell} ${(x + 1) * cell},${y * cell} ${(x + 1) * cell},${(y + 1) * cell} ${x * cell},${(y + 1) * cell}`, tinctureIndex: (x + y) % 2 };
  });
}
