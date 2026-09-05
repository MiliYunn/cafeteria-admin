import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../core/auth.service';
import { ActivityService } from '../core/activity.service';
import { errorMessage } from '../core/api.service';
import { Icon } from '../shared/icon';
import { Dialog } from '../shared/dialog';

@Component({
  selector: 'app-profile',
  imports: [Icon, Dialog, DatePipe, RouterLink],
  template: ` <section class="page-heading">
      <div>
        <div class="eyebrow">PERSONAL WORKSPACE</div>
        <h1>My account<span class="heading-dot">.</span></h1>
        <p>Your profile and secure admin session.</p>
      </div>
      <button class="btn btn-secondary" (click)="load()" [disabled]="loading()">
        <app-icon name="refresh" [size]="17" />Refresh profile
      </button>
    </section>
    @if (error()) {
      <div class="error-banner" role="alert">{{ error() }}</div>
    }
    <div class="profile-grid">
      <section class="card">
        <div class="profile-cover"></div>
        <div class="profile-body">
          <span class="profile-avatar"><app-icon name="staffs" [size]="38" /></span
          ><span class="status-pill"><span></span>Administrator</span>
          <h2>{{ auth.user()?.['fullname'] || 'Administrator' }}</h2>
          <p class="muted">{{ auth.user()?.['email'] }}</p>
          <dl class="details-grid">
            @for (field of fields; track field.key) {
              <div>
                <dt>{{ field.label }}</dt>
                <dd>{{ auth.user()?.[field.key] ?? '—' }}</dd>
              </div>
            }
            <div>
              <dt>Created</dt>
              <dd>
                {{
                  auth.user()?.['created_at'] ? (auth.user()?.['created_at'] | date: 'medium') : '—'
                }}
              </dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>
                {{
                  auth.user()?.['updated_at'] ? (auth.user()?.['updated_at'] | date: 'medium') : '—'
                }}
              </dd>
            </div>
          </dl>
          <a routerLink="/users" class="btn btn-secondary"
            >Manage user records <app-icon name="arrow" [size]="16"
          /></a>
        </div>
      </section>
      <section class="card session-card">
        <header class="card-header">
          <div>
            <h2>Session & security</h2>
            <p>You're in control of this browser session.</p>
          </div>
          <span class="mini-icon"><app-icon name="lock" /></span>
        </header>
        <div class="session-body">
          <div class="session-info">
            <app-icon name="key" [size]="22" />
            <div>
              <strong>Access token</strong
              ><small>Expires {{ auth.session()?.expiresAt | date: 'medium' }}</small>
            </div>
          </div>
          <p class="muted">
            Access tokens refresh automatically when needed. You can also request a new access and
            refresh token pair below.
          </p>
          <button class="btn btn-secondary" (click)="refresh()" [disabled]="busy()">
            <app-icon name="refresh" [size]="17" [class.spin]="busy()" />Refresh session
          </button>
          <div class="security-divider"></div>
          <h3>Revoke current access</h3>
          <p class="muted">
            Invalidate your current access token and sign out here. This does not revoke other
            sessions or all refresh tokens.
          </p>
          <button class="btn btn-danger-outline" (click)="confirm.set(true)" [disabled]="busy()">
            <app-icon name="lock" [size]="17" />Revoke access & sign out
          </button>
          <div class="security-note">
            <app-icon name="roles" [size]="20" /><span
              >Tokens are stored only for this browser tab. Never share them in screenshots,
              messages, or source code.</span
            >
          </div>
        </div>
      </section>
    </div>
    @if (confirm()) {
      <app-dialog title="Revoke this access token?" [busy]="busy()" (closed)="confirm.set(false)"
        ><div class="modal-body">
          <p class="muted">
            You will be signed out after the backend confirms revocation. Sign in again to start a
            new session.
          </p>
        </div>
        <footer class="modal-actions">
          <button class="btn btn-secondary" [disabled]="busy()" (click)="confirm.set(false)">
            Cancel</button
          ><button class="btn btn-danger" [disabled]="busy()" (click)="revoke()">
            {{ busy() ? 'Revoking…' : 'Revoke & sign out' }}
          </button>
        </footer></app-dialog
      >
    }`,
})
export class Profile {
  readonly auth = inject(AuthService);
  private activity = inject(ActivityService);
  private toast = inject(ToastrService);
  private destroyRef = inject(DestroyRef);
  busy = signal(false);
  loading = signal(false);
  error = signal('');
  confirm = signal(false);
  fields = [
    { key: 'username', label: 'Username' },
    { key: 'role', label: 'Role' },
    { key: 'type', label: 'User type' },
    { key: 'department_id', label: 'Department ID' },
    { key: 'id', label: 'User ID' },
    { key: 'is_active', label: 'Active' },
  ];
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.auth
      .profile()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({ error: (error) => this.error.set(errorMessage(error)) });
  }
  refresh() {
    this.busy.set(true);
    this.auth
      .refresh()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success('Your tokens were refreshed securely.');
          this.activity.add('Session refreshed', 'A new token pair was issued.');
        },
        error: (error) => {
          this.toast.error(errorMessage(error));
          if (error.status === 401 || error.status === 403) this.auth.clear();
        },
      });
  }
  revoke() {
    this.busy.set(true);
    this.auth
      .revoke()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.auth.clear();
          this.toast.success('Access revoked. You are signed out.');
        },
        error: (error) => this.toast.error(errorMessage(error)),
      });
  }
}
