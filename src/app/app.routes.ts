import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { AuthService } from './core/auth.service';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [
      () => inject(AuthService).authenticated() || inject(Router).createUrlTree(['/login']),
    ],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        title: 'Overview · APCafeteria',
        loadComponent: () => import('./pages/overview').then((m) => m.Overview),
      },
      {
        path: 'profile',
        title: 'My account · APCafeteria',
        loadComponent: () => import('./pages/profile').then((m) => m.Profile),
      },
      {
        path: 'uploads',
        title: 'File library · APCafeteria',
        loadComponent: () => import('./pages/uploads').then((m) => m.Uploads),
      },
      ...['roles', 'users', 'categories', 'genres', 'payment-methods', 'shops'].map((resource) => ({
        path: resource,
        data: { resource },
        loadComponent: () => import('./pages/resource-page').then((m) => m.ResourcePage),
      })),
      { path: '**', redirectTo: 'overview' },
    ],
  },
];
