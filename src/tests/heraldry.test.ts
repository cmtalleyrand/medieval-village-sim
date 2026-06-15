import assert from 'node:assert/strict';
import { generateBlazon } from '../heraldry/blazon';
import { DEFAULT_COAT } from '../heraldry/defaults';
import { fieldShapes } from '../heraldry/geometry';
import { validateCoat } from '../heraldry/validation';

const validCoat = { ...DEFAULT_COAT, field: { ...DEFAULT_COAT.field, division: 'plain' as const, tinctures: ['gules' as const, 'argent' as const] }, ordinary: { ...DEFAULT_COAT.ordinary, type: 'none' as const }, charge: { ...DEFAULT_COAT.charge, tincture: 'or' as const } };
assert.equal(generateBlazon(validCoat), 'Gules, a lion rampant Or.');
assert.equal(validateCoat(validCoat).filter((issue) => issue.severity === 'warning').length, 0);

const invalidCoat = { ...validCoat, charge: { ...validCoat.charge, tincture: 'azure' as const } };
assert.equal(validateCoat(invalidCoat).some((issue) => issue.rule === 'rule_of_tincture'), true);

assert.equal(fieldShapes('barry', 6).length, 6);
assert.equal(fieldShapes('chequy', 4).length, 16);

console.log('heraldry tests passed');
