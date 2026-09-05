import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService, Entity, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ActivityService } from '../core/activity.service';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-overview',
  imports: [DatePipe, RouterLink, Icon],
  template: ` <section class="page-heading">
      <div>
        <div class="eyebrow">YOUR CAMPUS, AT A GLANCE</div>
        <h1>Overview<span class="heading-dot">.</span></h1>
        <p>A little clarity for a well-run cafeteria.</p>
      </div>
      <div class="date-chip">
        <app-icon name="clock" [size]="17" />{{ today | date: 'EEEE, dd MMM yyyy' }}
      </div>
    </section>
    <section class="welcome-banner">
      <div class="welcome-copy">
        <span class="welcome-label"><span></span> ADMIN WORKSPACE</span>
        <h2>Good {{ greeting }}, {{ firstName() }}.</h2>
        <p>
          Great campus days start with the little things.<br />Let's make this one run smoothly.
        </p>
        <a routerLink="/shops" class="btn btn-white"
          >Manage your shops <app-icon name="forward" [size]="17"
        /></a>
      </div>
      <div class="banner-art" aria-hidden="true">
        <div class="art-orbit"></div>
        <div class="art-orbit inner"></div>
        <div class="art-plate">
          <div class="plate-inner"><app-icon name="genres" [size]="54" /></div>
        </div>
        <span class="art-bubble bubble-shop"><app-icon name="shops" [size]="25" /></span
        ><span class="art-bubble bubble-leaf"><app-icon name="categories" [size]="24" /></span
        ><span class="art-star">✦</span><span class="art-dot"></span
        ><span class="art-caption">A TASTE OF CAMPUS LIFE</span>
      </div>
    </section>
    <section class="stats-grid" aria-label="Campus totals">
      @for (metric of metrics(); track metric.key) {
        <a class="stat-card card" [routerLink]="'/' + metric.key"
          ><div class="stat-top">
            <span class="stat-icon" [class]="'stat-icon tone-' + metric.tone"
              ><app-icon [name]="metric.key" [size]="21" /></span
            ><app-icon name="arrow" [size]="18" />
          </div>
          <div class="stat-value">
            {{ metric.loading ? '…' : metric.total === null ? '—' : metric.total }}
          </div>
          <div class="stat-bottom">
            <span>{{ metric.label }}</span
            ><span class="stat-caption">{{ metric.error ? 'Unavailable' : 'Total records' }}</span>
          </div></a
        >
      }
    </section>
    @if (loadError()) {
      <div class="error-banner" role="alert">
        <app-icon name="alert" />{{ loadError()
        }}<button class="text-button" (click)="load()" [disabled]="loading()">
          Retry overview
        </button>
      </div>
    }
    <div class="overview-grid">
      <section class="card directory-card">
        <header class="card-header">
          <div>
            <h2>Campus shops</h2>
            <p>Your food community, in one place.</p>
          </div>
          <a class="text-button" routerLink="/shops"
            >View all <app-icon name="forward" [size]="16"
          /></a>
        </header>
        @if (loading()) {
          <div class="table-loading">
            @for (n of [1, 2, 3]; track n) {
              <div class="skeleton-row">
                <span class="skeleton skeleton-avatar"></span><span class="skeleton"></span
                ><span class="skeleton"></span>
              </div>
            }
          </div>
        } @else if (shops().length) {
          <div class="shop-directory">
            @for (shop of shops(); track shop.id; let i = $index) {
              <a routerLink="/shops" class="directory-row"
                ><span [class]="'shop-avatar tone-' + (i % 2 ? 'violet' : 'blue')"
                  ><app-icon name="shops" [size]="23"
                /></span>
                <div>
                  <strong>{{ shop['name'] }}</strong
                  ><small>{{ shop['location'] || 'Campus shop' }}</small>
                </div>
                <span class="status-pill" [class.inactive]="!shop['is_active']"
                  ><span></span>{{ shop['is_active'] ? 'Active' : 'Inactive' }}</span
                ><app-icon name="right" [size]="17"
              /></a>
            }
          </div>
        } @else {
          <div class="empty-state compact">
            <app-icon name="shops" [size]="32" />
            <h3>
              {{ loadError() ? 'Shop directory unavailable' : 'Your campus starts here' }}
            </h3>
            <p>
              {{
                loadError()
                  ? 'Check your backend connection and try again.'
                  : 'Add a shop to begin building your campus directory.'
              }}
            </p>
            <a routerLink="/shops" class="text-button"
              >Go to shops <app-icon name="forward" [size]="16"
            /></a>
          </div>
        }
        <footer class="card-bottom-note">
          <app-icon name="globe" [size]="15" />Connected to your cafeteria database
        </footer>
      </section>
      <section class="card quick-actions">
        <header class="card-header">
          <div>
            <h2>Make things happen</h2>
            <p>A shortcut to your everyday tasks.</p>
          </div>
          <span class="mini-icon"><app-icon name="arrow" [size]="19" /></span>
        </header>
        @for (action of actions; track action.path) {
          <a [routerLink]="action.path" class="quick-action"
            ><span class="quick-icon"><app-icon [name]="action.icon" [size]="21" /></span>
            <div>
              <strong>{{ action.title }}</strong
              ><small>{{ action.description }}</small>
            </div>
            <app-icon name="right" [size]="16"
          /></a>
        }
      </section>
    </div>
    <div class="overview-lower">
      <section class="card activity-card">
        <header class="card-header">
          <div>
            <h2>Recent activity</h2>
            <p>Updates from this browser session.</p>
          </div>
          <app-icon name="activity" [size]="20" />
        </header>
        @for (item of activity.items().slice(0, 3); track item.id) {
          <div class="activity-row">
            <span class="activity-dot"></span>
            <div>
              <strong>{{ item.title }}</strong
              ><small>{{ item.detail }}</small>
            </div>
            <time>{{ item.at | date: 'shortTime' }}</time>
          </div>
        } @empty {
          <p class="muted p-6">Your admin actions will appear here.</p>
        }
      </section>
      <section class="system-card">
        <span class="eyebrow">SYSTEM CONNECTION</span>
        <div class="system-status">
          <span [class]="'connection-dot ' + health()"></span>
          <h3>
            {{
              health() === 'healthy'
                ? 'Backend is online'
                : health() === 'checking'
                  ? 'Checking connection…'
                  : 'Backend unavailable'
            }}
          </h3>
        </div>
        <p>
          {{
            health() === 'healthy'
              ? 'The cafeteria health endpoint is responding.'
              : 'Start the Flask backend on port 8000 to connect.'
          }}
        </p>
        <button class="text-button" (click)="checkHealth()" [disabled]="health() === 'checking'">
          Check connection <app-icon name="refresh" [size]="15" />
        </button>
      </section>
    </div>`,
})
export class Overview {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  readonly activity = inject(ActivityService);
  readonly today = new Date();
  readonly greeting =
    this.today.getHours() < 12 ? 'morning' : this.today.getHours() < 18 ? 'afternoon' : 'evening';
  shops = signal<Entity[]>([]);
  loading = signal(true);
  loadError = signal('');
  health = signal('checking');
  metrics = signal([
    {
      key: 'shops',
      label: 'Campus shops',
      tone: 'blue',
      total: null as number | null,
      loading: true,
      error: false,
    },
    {
      key: 'users',
      label: 'Community members',
      tone: 'violet',
      total: null as number | null,
      loading: true,
      error: false,
    },
    {
      key: 'categories',
      label: 'Shop categories',
      tone: 'amber',
      total: null as number | null,
      loading: true,
      error: false,
    },
    {
      key: 'payment-methods',
      label: 'Payment methods',
      tone: 'green',
      total: null as number | null,
      loading: true,
      error: false,
    },
  ]);
  readonly actions = [
    {
      path: '/users',
      icon: 'users',
      title: 'Manage your people',
      description: 'Users, access, and the campus community',
    },
    {
      path: '/uploads',
      icon: 'upload',
      title: 'Upload something useful',
      description: 'Logos, images, and documents',
    },
  ];
  constructor() {
    this.load();
    this.checkHealth();
  }
  firstName() {
    return (this.auth.user()?.['fullname'] || 'Admin').split(' ')[0];
  }
  load() {
    this.loadError.set('');
    this.loading.set(true);
    this.metrics.update((all) => all.map((metric) => ({ ...metric, loading: true })));
    for (const metric of this.metrics())
      this.api
        .get<Entity[]>(metric.key, {
          page: 1,
          per_page: metric.key === 'shops' ? 4 : 1,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            this.metrics.update((all) =>
              all.map((item) =>
                item.key === metric.key
                  ? {
                      ...item,
                      total: response.pagination?.total ?? null,
                      loading: false,
                      error: false,
                    }
                  : item,
              ),
            );
            if (metric.key === 'shops') {
              this.shops.set(response.data);
              this.loading.set(false);
            }
          },
          error: (error) => {
            this.metrics.update((all) =>
              all.map((item) =>
                item.key === metric.key
                  ? { ...item, total: null, loading: false, error: true }
                  : item,
              ),
            );
            this.loadError.set(errorMessage(error));
            if (metric.key === 'shops') this.loading.set(false);
          },
        });
  }
  checkHealth() {
    this.health.set('checking');
    this.api
      .health()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) =>
          this.health.set(response.data.status === 'healthy' ? 'healthy' : 'offline'),
        error: () => this.health.set('offline'),
      });
  }
}
