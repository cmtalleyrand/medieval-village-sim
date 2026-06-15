export type Tincture = 'or' | 'argent' | 'gules' | 'azure' | 'sable' | 'vert' | 'purpure' | 'ermine' | 'vair';
export type ShieldShape = 'heater' | 'french' | 'iberian' | 'lozenge';
export type FieldDivision = 'plain' | 'per_pale' | 'per_fess' | 'per_bend' | 'per_bend_sinister' | 'quarterly' | 'per_saltire' | 'barry' | 'paly' | 'chequy';
export type OrdinaryType = 'none' | 'chief' | 'pale' | 'fess' | 'bend' | 'bend_sinister' | 'chevron' | 'cross' | 'saltire' | 'bordure' | 'canton' | 'pile';
export type ChargeType = 'lion' | 'eagle' | 'fleur_de_lis' | 'crosslet' | 'mullet' | 'crescent' | 'tower' | 'sword' | 'rose' | 'escallop';
export type ChargeAttitude = 'rampant' | 'passant' | 'displayed' | 'erect' | 'default';
export type ChargeArrangement = 'single' | 'two' | 'three' | 'three_two_one';
export type Position = 'center' | 'chief' | 'base' | 'dexter' | 'sinister' | 'dexter_chief' | 'sinister_chief' | 'dexter_base' | 'sinister_base';

export type Field = {
  division: FieldDivision;
  tinctures: Tincture[];
  count: number;
};

export type Ordinary = {
  type: OrdinaryType;
  tincture: Tincture;
};

export type Charge = {
  type: ChargeType;
  attitude: ChargeAttitude;
  tincture: Tincture;
  arrangement: ChargeArrangement;
  position: Position;
  scale: number;
};

export type ExternalOrnaments = {
  motto: string;
  helm: boolean;
  supporters: boolean;
};

export type CoatOfArms = {
  shieldShape: ShieldShape;
  field: Field;
  ordinary: Ordinary;
  charge: Charge;
  externalOrnaments: ExternalOrnaments;
};

export type ValidationIssue = {
  severity: 'info' | 'warning' | 'error';
  rule: string;
  message: string;
};
