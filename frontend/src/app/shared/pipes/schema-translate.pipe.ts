import { inject, Pipe, PipeTransform } from '@angular/core';
import { I18nService } from '../../core/services';

export type SchemaTranslationCategory =
  'ui' | 'scale' | 'groupTitle' | 'groupDesc' | 'itemLabel' | 'itemTooltip' | 'option';

/**
 * Impure reactive pipe resolving schema and UI translations using I18nService signals.
 */
@Pipe({
  name: 'schemaTranslate',
  standalone: true,
  pure: false,
})
export class SchemaTranslatePipe implements PipeTransform {
  private readonly i18nService = inject(I18nService);

  transform(
    id: string,
    category: SchemaTranslationCategory,
    params?: Record<string, string | number>,
  ): string {
    // Subscribe template consumers to reactive language changes under OnPush/zoneless CD.
    this.i18nService.currentLang();

    if (!id) {
      return '';
    }

    switch (category) {
      case 'ui':
        return this.i18nService.translateUi(id, params);
      case 'scale':
        return this.i18nService.getScaleLabel(id);
      case 'groupTitle':
        return this.i18nService.getGroupTitle(id);
      case 'groupDesc':
        return this.i18nService.getGroupDescription(id);
      case 'itemLabel':
        return this.i18nService.getItemLabel(id);
      case 'itemTooltip':
        return this.i18nService.getItemTooltip(id);
      case 'option':
        return this.i18nService.getOptionLabel(id);
    }
  }
}
