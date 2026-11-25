export type BuiltInScaleId =
  'not_applicable' | 'hard_limit' | 'soft_limit' | 'curious' | 'enjoy' | 'favorite';

export type ScaleId = BuiltInScaleId | (string & {});

export const BUILT_IN_SCALE_IDS: readonly BuiltInScaleId[] = [
  'not_applicable',
  'hard_limit',
  'soft_limit',
  'curious',
  'enjoy',
  'favorite',
];

export type QuestionType = 'scale_matrix' | 'single_choice' | 'multiple_choice' | 'restricted_text';

export type RolePairId = 'giving_receiving' | 'dominant_submissive' | 'self_partner' | 'general';

export type ParticipantRoleId =
  | 'top'
  | 'bottom'
  | 'switch'
  | 'dominant'
  | 'submissive'
  | 'sadist'
  | 'masochist'
  | 'fetishist'
  | 'rigger'
  | 'bunny'
  | 'other';

export const ALL_PARTICIPANT_ROLES: readonly ParticipantRoleId[] = [
  'top',
  'bottom',
  'switch',
  'dominant',
  'submissive',
  'sadist',
  'masochist',
  'fetishist',
  'rigger',
  'bunny',
  'other',
];

export interface ScaleOption {
  readonly id: ScaleId;
  readonly value?: string | number;
  readonly order: number;
  readonly label?: string;
  readonly color: string;
  readonly contrastColor: string;
  readonly icon: string;
}

export interface ChoiceOptionDefinition {
  readonly id: string;
  readonly value: string;
  readonly order: number;
  readonly label?: string;
}

export type ChoiceOptionInput = string | ChoiceOptionDefinition;

export interface ItemDefinition {
  readonly id: string;
  readonly groupId?: string;
  readonly participantRoles?: readonly ParticipantRoleId[];
  readonly type: QuestionType;
  readonly dualRole?: boolean;
  readonly rolePairId?: RolePairId;
  readonly scaleRef?: string;
  readonly scales?: readonly ScaleOption[];
  readonly options?: readonly ChoiceOptionInput[];
  readonly allowOtherOption?: boolean;
  readonly maxLength?: number;
}

export interface GroupDefinition {
  readonly id: string;
  readonly order: number;
  readonly defaultDualRole: boolean;
  readonly rolePairId: RolePairId;
  readonly participantRoles?: readonly ParticipantRoleId[];
  readonly items: readonly ItemDefinition[];
}

export interface ChecklistSchema {
  readonly schemaVersion: string;
  readonly participantRoles?: readonly ParticipantRoleId[];
  readonly scales: readonly ScaleOption[];
  readonly scaleSets?: Readonly<Record<string, readonly ScaleOption[]>>;
  readonly groups: readonly GroupDefinition[];
}
