export type ScaleId =
  'not_applicable' | 'hard_limit' | 'soft_limit' | 'curious' | 'enjoy' | 'favorite';

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
  readonly order: number;
  readonly color: string;
  readonly contrastColor: string;
  readonly icon: string;
}

export interface ItemDefinition {
  readonly id: string;
  readonly groupId?: string;
  readonly participantRoles?: readonly ParticipantRoleId[];
  readonly type: QuestionType;
  readonly dualRole?: boolean;
  readonly rolePairId?: RolePairId;
  readonly scaleRef?: string;
  readonly options?: readonly string[];
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
  readonly groups: readonly GroupDefinition[];
}
