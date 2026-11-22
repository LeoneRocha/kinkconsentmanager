export type ExportFormat = 'png' | 'pdf' | 'json' | 'csv';

export interface ExportResult {
  readonly format: ExportFormat;
  readonly filename: string;
  readonly success: boolean;
  readonly errorMessage?: string;
}

export interface FlattenedChecklistRow {
  readonly groupId: string;
  readonly groupTitle: string;
  readonly itemId: string;
  readonly itemLabel: string;
  readonly isDualRole: boolean;
  readonly primaryRoleLabel: string;
  readonly secondaryRoleLabel?: string;
  readonly primaryValueLabel: string;
  readonly secondaryValueLabel?: string;
  readonly primaryColor?: string;
  readonly secondaryColor?: string;
  readonly selectedOptionsLabels: readonly string[];
  readonly customNote: string;
}

export interface ResolvedRolePairLabels {
  readonly primary: string;
  readonly secondary?: string;
}

export interface ResolvedPreviewTexts {
  readonly title: string;
  readonly schemaVersionLabel: string;
  readonly generatedAtLabel: string;
  readonly generatedAtValue: string;
  readonly notAnsweredLabel: string;
  readonly otherLabel: string;
  readonly scales: Readonly<Record<string, string>>;
  readonly roles: Readonly<Record<string, ResolvedRolePairLabels>>;
  readonly groups: Readonly<Record<string, { readonly title: string; readonly description?: string }>>;
  readonly items: Readonly<Record<string, { readonly label: string; readonly tooltip?: string }>>;
  readonly options: Readonly<Record<string, string>>;
}
