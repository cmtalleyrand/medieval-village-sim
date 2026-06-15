import { CoatOfArms, Tincture, ValidationIssue } from './types';
import { tinctureClasses, tinctureLabels } from './tinctures';

function conflicts(a: Tincture, b: Tincture) {
  const ac = tinctureClasses[a];
  const bc = tinctureClasses[b];
  return ac !== 'fur' && ac === bc;
}

function tinctureWarning(topName: string, top: Tincture, bottomName: string, bottom: Tincture): ValidationIssue | undefined {
  if (!conflicts(top, bottom)) return undefined;
  return {
    severity: 'warning',
    rule: 'rule_of_tincture',
    message: `${topName} ${tinctureLabels[top]} lies over ${bottomName} ${tinctureLabels[bottom]}; traditional heraldry usually avoids metal-on-metal and colour-on-colour.`,
  };
}

export function validateCoat(coat: CoatOfArms): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const base = coat.field.tinctures[0];
  if (coat.ordinary.type !== 'none') {
    const issue = tinctureWarning('Ordinary', coat.ordinary.tincture, 'field', base);
    if (issue) issues.push(issue);
  }
  const chargeBase = coat.ordinary.type === 'none' ? base : coat.ordinary.tincture;
  const chargeIssue = tinctureWarning('Charge', coat.charge.tincture, coat.ordinary.type === 'none' ? 'field' : 'ordinary', chargeBase);
  if (chargeIssue) issues.push(chargeIssue);
  if (coat.field.tinctures.length > 1) {
    const mixed = coat.field.tinctures.some((tincture) => conflicts(coat.charge.tincture, tincture)) && coat.field.tinctures.some((tincture) => !conflicts(coat.charge.tincture, tincture));
    if (mixed) issues.push({ severity: 'info', rule: 'divided_field', message: 'The charge crosses a divided field; historical contrast depends on the exact overlap of each tincture.' });
  }
  return issues;
}
