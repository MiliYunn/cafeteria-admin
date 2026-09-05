import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/api.service';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Icon],
  template: ` <div class="login-page">
    <section class="login-story">
      <a class="brand" href="/"
        ><span class="brand-mark">A<span></span></span
        ><span class="brand-text">Cafeteria<small>ADMIN PORTAL</small></span></a
      >
      <div class="login-story-content">
        <span class="login-pill"><span></span> THE CAMPUS, CONNECTED</span>
        <h1>A little order.<br />A better<br /><em>campus day.</em></h1>
        <p>
          One place to bring your cafeteria's people,<br class="desktop-only" />
          shops, and everyday operations together.
        </p>
        <div class="login-orbit">
          <div class="orbit-ring ring-one"></div>
          <div class="orbit-ring ring-two"></div>
          <div class="orbit-center"><app-icon name="genres" [size]="48" /></div>
          <span class="orbit-card orbit-shop"
            ><app-icon name="shops" /><span>Campus shops<small>All in one place</small></span></span
          ><span class="orbit-card orbit-people"
            ><app-icon name="users" /><span
              >People first<small>Built for your community</small></span
            ></span
          ><span class="orbit-spark"></span>
        </div>
      </div>
      <div class="login-story-footer">
        <span>Good food. Connected people.</span><span>CAMPUS / MALAYSIA</span>
      </div>
    </section>
    <section class="login-panel">
      <span class="login-admin-label"><app-icon name="roles" [size]="16" /> ADMIN PORTAL</span>
      <div class="login-form-wrap">
        <span class="eyebrow">WELCOME BACK</span>
        <h2>Sign in to your workspace</h2>
        <p class="muted">Manage the everyday. Make room for what matters.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (error()) {
            <div class="error-banner" role="alert"><app-icon name="alert" />{{ error() }}</div>
          }
          <div class="field">
            <label for="login-email">Email address</label>
            <div class="input-with-icon">
              <app-icon name="mail" [size]="19" /><input
                id="login-email"
                formControlName="email"
                type="email"
                autocomplete="username"
                placeholder="admin@example.com"
                [attr.aria-invalid]="invalid('email')"
                aria-describedby="email-error"
              />
            </div>
            @if (invalid('email')) {
              <small id="email-error" class="field-error">Enter a valid email address.</small>
            }
          </div>
          <div class="field">
            <label for="login-password">Password</label>
            <div class="input-with-icon">
              <app-icon name="lock" [size]="19" /><input
                id="login-password"
                formControlName="password"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Enter your password"
                [attr.aria-invalid]="invalid('password')"
                aria-describedby="password-error"
              /><button
                type="button"
                class="password-toggle"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                (click)="showPassword.set(!showPassword())"
              >
                <app-icon name="eye" [size]="18" />
              </button>
            </div>
            @if (invalid('password')) {
              <small id="password-error" class="field-error"
                >Enter your password (maximum 15 characters, as required by the current API).</small
              >
            }
          </div>
          <div class="login-session-note">
            <app-icon name="lock" [size]="14" /> Your session stays in this browser tab.
          </div>
          <button class="btn btn-primary login-submit" type="submit" [disabled]="busy()">
            {{ busy() ? 'Signing you in…' : 'Sign in'
            }}<app-icon [name]="busy() ? 'loading' : 'forward'" [class.spin]="busy()" [size]="18" />
          </button>
        </form>
        <div class="login-help">
          Having trouble signing in?<br /><span>Contact your cafeteria system administrator.</span>
        </div>
      </div>
      <footer>© {{ year }} Cafeteria <span>Secure administrator access</span></footer>
    </section>
  </div>`,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastrService);
  readonly year = new Date().getFullYear();
  busy = signal(false);
  error = signal('');
  showPassword = signal(false);
  form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(15)],
    }),
  });
  constructor() {
    if (this.auth.authenticated()) void this.router.navigate(['/overview']);
  }
  invalid(key: 'email' | 'password') {
    return this.form.controls[key].touched && this.form.controls[key].invalid;
  }
  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    this.auth
      .login(value.email.trim(), value.password)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Your campus workspace is ready.', 'Welcome back');
          void this.router.navigate(['/overview']);
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
}
