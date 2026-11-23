import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SchemaTranslatePipe } from '../../shared/pipes';

@Component({
  selector: 'app-footer',
  imports: [SchemaTranslatePipe],
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppFooterComponent {
  readonly appName = input<string>(environment.appName);
  readonly appVersion = input<string>(environment.version);
  readonly buildDate = input<string>(environment.buildDate);
  readonly currentYear = input<number>(new Date().getFullYear());
}
