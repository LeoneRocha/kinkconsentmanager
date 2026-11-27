import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginRequest } from '../../../../core/models';
import { SchemaTranslatePipe } from '../../../../shared/pipes';

/**
 * Formulário desacoplado de login (login ou e-mail + senha) com link para cadastro.
 */
@Component({
  selector: 'app-auth-login-form',
  imports: [ReactiveFormsModule, SchemaTranslatePipe],
  templateUrl: './auth-login-form.component.html',
  styleUrl: './auth-login-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLoginFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly initialIdentifier = input<string>('');

  readonly submitted = output<LoginRequest>();
  readonly switchToRegister = output<void>();
  readonly backRequested = output<void>();

  protected readonly showPassword = signal<boolean>(false);

  protected readonly form = this.fb.nonNullable.group({
    loginOrEmail: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const initial = this.initialIdentifier().trim();
      if (initial && !this.form.controls.loginOrEmail.dirty) {
        this.form.controls.loginOrEmail.setValue(initial);
      }
    });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((current) => !current);
  }

  protected onSubmit(): void {
    if (this.isLoading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitted.emit({
      loginOrEmail: raw.loginOrEmail.trim(),
      password: raw.password,
    });
  }

  protected onSwitchToRegister(): void {
    this.switchToRegister.emit();
  }

  protected onBack(): void {
    this.backRequested.emit();
  }
}
