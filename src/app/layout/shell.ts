import { Component, HostListener, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../core/auth.service';
import { ActivityService } from '../core/activity.service';
import { errorMessage } from '../core/api.service';
import { Icon } from '../shared/icon';
import { Dialog } from '../shared/dialog';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon, DatePipe, Dialog],
  templateUrl: './shell.html',
})
export class Shell {
  readonly auth = inject(AuthService);
  readonly activity = inject(ActivityService);
  private router = inject(Router);
  private toast = inject(ToastrService);
  collapsed = signal(false);
  mobile = signal(false);
  dark = signal(document.documentElement.classList.contains('dark'));
  notifications = signal(false);
  confirmLogout = signal(false);
  loggingOut = signal(false);
  groups = [
    {
      label: 'People & access',
      icon: 'users',
      open: true,
      links: [
        { path: 'users', label: 'Users' },
        { path: 'roles', label: 'Roles' },
      ],
    },
    {
      label: 'Cafeteria',
      icon: 'shops',
      open: true,
      links: [
        { path: 'shops', label: 'Shops' },
        { path: 'categories', label: 'Categories' },
        { path: 'genres', label: 'Genres' },
      ],
    },
    {
      label: 'Payments',
      icon: 'payment-methods',
      open: true,
      links: [{ path: 'payment-methods', label: 'Payment methods' }],
    },
  ];
  constructor() {
    try {
      this.dark.set(localStorage.getItem('cafeteria.theme') === 'dark');
      this.collapsed.set(localStorage.getItem('cafeteria.sidebar') === 'collapsed');
    } catch {
      /* Defaults if preferences are unavailable. */
    }
    document.documentElement.classList.toggle('dark', this.dark());
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.mobile.set(false);
        this.notifications.set(false);
      });
  }
  toggleSidebar() {
    this.collapsed.update((value) => !value);
    try {
      localStorage.setItem('cafeteria.sidebar', this.collapsed() ? 'collapsed' : 'expanded');
    } catch {
      /* Optional preference. */
    }
  }
  toggleTheme() {
    this.dark.update((value) => !value);
    document.documentElement.classList.toggle('dark', this.dark());
    try {
      localStorage.setItem('cafeteria.theme', this.dark() ? 'dark' : 'light');
    } catch {
      /* Optional preference. */
    }
  }
  section() {
    const path = this.router.url.split('?')[0].split('/')[1];
    return (
      (
        {
          overview: 'Overview',
          profile: 'My account',
          uploads: 'File library',
          'payment-methods': 'Payment methods',
        } as Record<string, string>
      )[path] || path.charAt(0).toUpperCase() + path.slice(1)
    );
  }
  initials() {
    return (this.auth.user()?.['fullname'] || 'Admin')
      .split(' ')
      .map((word: string) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  toggleGroup(group: (typeof this.groups)[number]) {
    if (this.collapsed()) {
      this.toggleSidebar();
      group.open = true;
    } else group.open = !group.open;
  }
  @HostListener('document:click', ['$event']) outside(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.notification-wrap')) this.notifications.set(false);
  }
  @HostListener('document:keydown.escape') escape() {
    this.notifications.set(false);
    this.mobile.set(false);
  }
  logout() {
    this.loggingOut.set(true);
    this.auth.logout().subscribe({
      next: () => {
        this.auth.clear();
        this.toast.success('You have been signed out.');
      },
      error: (error) => {
        // Always discard local credentials; a network failure cannot guarantee server revocation.
        this.auth.clear();
        this.toast.warning(`${errorMessage(error)} Local credentials have been cleared.`);
      },
    });
  }
}
