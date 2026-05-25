export type Unit = 'cartload' | 'm3' | 'kg' | 'kcal';

interface ConversionEdge {
  to: Unit;
  factor: number;
}

export function createUnitRegistry(params: { m3PerCartload: number; kgPerM3: number; kcalPerKg: number }) {
  const graph: Record<Unit, ConversionEdge[]> = {
    cartload: [{ to: 'm3', factor: params.m3PerCartload }],
    m3: [
      { to: 'cartload', factor: 1 / params.m3PerCartload },
      { to: 'kg', factor: params.kgPerM3 },
    ],
    kg: [
      { to: 'm3', factor: 1 / params.kgPerM3 },
      { to: 'kcal', factor: params.kcalPerKg },
    ],
    kcal: [{ to: 'kg', factor: 1 / params.kcalPerKg }],
  };

  const convert = (value: number, from: Unit, to: Unit) => {
    if (from === to) return value;
    const queue: Array<{ unit: Unit; factor: number }> = [{ unit: from, factor: 1 }];
    const visited = new Set<Unit>([from]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of graph[current.unit]) {
        if (visited.has(edge.to)) continue;
        const nextFactor = current.factor * edge.factor;
        if (edge.to === to) return value * nextFactor;
        visited.add(edge.to);
        queue.push({ unit: edge.to, factor: nextFactor });
      }
    }
    throw new Error(`No conversion path from ${from} to ${to}`);
  };

  return { convert };
}
