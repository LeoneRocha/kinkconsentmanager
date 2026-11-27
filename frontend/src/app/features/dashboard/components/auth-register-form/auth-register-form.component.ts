import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RegisterRequest } from '../../../../core/models';
import { SchemaTranslatePipe } from '../../../../shared/pipes';

const LOGIN_PATTERN = /^[a-zA-Z0-9._-]{3,50}$/;

function passwordPolicyValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value ?? '';
    if (!value) {
      return null;
    }

    const validLength = value.length >= 8 && value.length <= 100;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasDigit = /\d/.test(value);
    const hasSpecial = /[^a-zA-Z0-9\s]/.test(value);
    const hasNoSpaces = !/\s/.test(value);

    return validLength && hasUpper && hasLower && hasDigit && hasSpecial && hasNoSpaces
      ? null
      : { passwordPolicy: true };
  };
}

function passwordsMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value as string | undefined;
    const confirmPassword = group.get('confirmPassword')?.value as string | undefined;
    if (!confirmPassword) {
      return null;
    }
    return password === confirmPassword ? null : { passwordMismatch: true };
  };
}

/**
 * Formulário desacoplado de cadastro (login, e-mail, senha e confirmação) com link para login.
 */
@Component({
  selector: 'app-auth-register-form',
  imports: [ReactiveFormsModule, SchemaTranslatePipe],
  templateUrl: './auth-register-form.component.html',
  styleUrl: './auth-register-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthRegisterFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<RegisterRequest>();
  readonly switchToLogin = output<void>();
  readonly backRequested = output<void>();

  protected readonly showPassword = signal<boolean>(false);
  protected readonly showConfirmPassword = signal<boolean>(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      login: ['', [Validators.required, Validators.pattern(LOGIN_PATTERN)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordPolicyValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator() },
  );

  protected togglePasswordVisibility(): void {
    this.showPassword.update((current) => !current);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((current) => !current);
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
      login: raw.login.trim(),
      email: raw.email.trim(),
      password: raw.password,
      confirmPassword: raw.confirmPassword,
    });
  }

  protected onSwitchToLogin(): void {
    this.switchToLogin.emit();
  }

  protected onBack(): void {
    this.backRequested.emit();
  }
}
