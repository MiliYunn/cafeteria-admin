import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, shareReplay, tap, throwError } from 'rxjs';
import { ADMIN_BASE, ApiResponse, Entity } from './api.service';
import { ActivityService } from './activity.service';

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  user?: Entity;
  role?: string;
}
export interface Session extends Tokens {
  expiresAt: number;
}
const SESSION_KEY = 'apcafeteria.admin.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private activity = inject(ActivityService);
  readonly session = signal<Session | null>(this.restore());
  readonly authenticated = computed(
    () => !!this.session()?.access_token && !!this.session()?.refresh_token,
  );
  readonly user = computed(() => this.session()?.user);
  private refreshing?: Observable<ApiResponse<Tokens>>;

  private restore(): Session | null {
    try {
      const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      return value &&
        typeof value.access_token === 'string' &&
        typeof value.refresh_token === 'string'
        ? value
        : null;
    } catch {
      return null;
    }
  }
  private save(tokens: Tokens) {
    const session = {
      ...tokens,
      user: tokens.user || this.user(),
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
    this.session.set(session);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* In-memory session still works when storage is unavailable. */
    }
  }
  login(email: string, password: string) {
    return this.http
      .post<ApiResponse<Tokens>>(`${ADMIN_BASE}/auth/login`, {
        email,
        password,
      })
      .pipe(
        tap((response) => {
          this.activity.clear();
          this.save(response.data);
          this.activity.add('Welcome back', 'You signed in to the admin portal.');
        }),
      );
  }
  refresh(): Observable<ApiResponse<Tokens>> {
    if (this.refreshing) return this.refreshing;
    const token = this.session()?.refresh_token;
    if (!token) return throwError(() => new Error('No refresh token'));
    this.refreshing = this.http
      .post<ApiResponse<Tokens>>(`${ADMIN_BASE}/auth/refresh-token`, {
        refresh_token: token,
      })
      .pipe(
        tap((response) => {
          if (this.session()?.refresh_token === token) this.save(response.data);
        }),
        finalize(() => {
          this.refreshing = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshing;
  }
  profile() {
    return this.http.get<ApiResponse<Entity>>(`${ADMIN_BASE}/auth/profile`).pipe(
      tap((response) => {
        const current = this.session();
        if (current) {
          const updated = { ...current, user: response.data };
          this.session.set(updated);
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
          } catch {
            /* Storage disabled. */
          }
        }
      }),
    );
  }
  logout() {
    return this.http.post<ApiResponse<null>>(`${ADMIN_BASE}/auth/logout`, {});
  }
  revoke() {
    return this.http.post<ApiResponse<null>>(`${ADMIN_BASE}/auth/revoke-token`, {});
  }
  clear() {
    this.session.set(null);
    this.activity.clear();
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* Storage disabled. */
    }
    void this.router.navigate(['/login']);
  }
}
