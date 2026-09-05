import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ApiService, ADMIN_BASE } from './api.service';
import { authInterceptor } from './auth.interceptor';

describe('Authentication and admin API integration', () => {
  let auth: AuthService;
  let api: ApiService;
  let http: HttpTestingController;
  const pair = (suffix = '1') => ({
    access_token: `access-${suffix}`,
    refresh_token: `refresh-${suffix}`,
    expires_in: 3600,
    refresh_expires_in: 604800,
  });
  const ok = (data: unknown) => ({ success: true, message: 'OK', data });
  function login() {
    auth.login('admin@example.com', 'password123').subscribe();
    http
      .expectOne(`${ADMIN_BASE}/auth/login`)
      .flush(ok({ ...pair(), user: { id: 1, fullname: 'Admin' } }));
  }
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: { navigate: vi.fn().mockResolvedValue(true) },
        },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });
  it('logs in without bearer authentication and stores the issued tokens', () => {
    auth.login('admin@example.com', 'password123').subscribe();
    const request = http.expectOne(`${ADMIN_BASE}/auth/login`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body).toEqual({
      email: 'admin@example.com',
      password: 'password123',
    });
    request.flush(ok(pair()));
    expect(auth.authenticated()).toBe(true);
  });
  it('sends pagination and supported filters with the access token', () => {
    login();
    api
      .get('roles', {
        page: 2,
        per_page: 20,
        search: 'admin',
        is_active: false,
      })
      .subscribe();
    const request = http.expectOne((r) => r.url === `${ADMIN_BASE}/roles`);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('is_active')).toBe('false');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-1');
    request.flush(ok([]));
  });
  it('omits empty optional filters', () => {
    api.get('roles', { search: '', is_active: '' }).subscribe();
    const request = http.expectOne(`${ADMIN_BASE}/roles`);
    expect(request.request.params.keys()).toEqual([]);
    request.flush(ok([]));
  });
  it('refreshes once for concurrent 401 responses, then retries both requests', () => {
    login();
    api.get('roles').subscribe();
    api.get('users').subscribe();
    http.expectOne(`${ADMIN_BASE}/roles`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${ADMIN_BASE}/users`).flush({}, { status: 401, statusText: 'Unauthorized' });
    const refresh = http.expectOne(`${ADMIN_BASE}/auth/refresh-token`);
    expect(refresh.request.body).toEqual({ refresh_token: 'refresh-1' });
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush(ok(pair('2')));
    for (const path of ['roles', 'users']) {
      const retry = http.expectOne(`${ADMIN_BASE}/${path}`);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
      retry.flush(ok([]));
    }
    expect(auth.session()?.refresh_token).toBe('refresh-2');
  });
  it('clears the session when refresh is rejected', () => {
    login();
    api.get('roles').subscribe({ error: () => {} });
    http.expectOne(`${ADMIN_BASE}/roles`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http
      .expectOne(`${ADMIN_BASE}/auth/refresh-token`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.authenticated()).toBe(false);
  });
  it('never refreshes a failed revoke request', () => {
    login();
    auth.revoke().subscribe({ error: () => {} });
    const request = http.expectOne(`${ADMIN_BASE}/auth/revoke-token`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-1');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone(`${ADMIN_BASE}/auth/refresh-token`);
  });
  it('does not restore a session from a late refresh after sign-out', () => {
    login();
    auth.refresh().subscribe();
    const request = http.expectOne(`${ADMIN_BASE}/auth/refresh-token`);
    auth.clear();
    request.flush(ok(pair('2')));
    expect(auth.authenticated()).toBe(false);
  });
  it('uploads with the multipart file field and does not force a JSON content type', () => {
    login();
    api.upload(new File(['abc'], 'logo.png', { type: 'image/png' })).subscribe();
    const request = http.expectOne(`${ADMIN_BASE}/uploads`);
    expect(request.request.body.get('file').name).toBe('logo.png');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush(ok({ url: '/cafeteria/uploads/logo.png' }));
  });
  it('calls the public health endpoint without an access token', () => {
    login();
    api.health().subscribe();
    const request = http.expectOne('/cafeteria/health');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(ok({ status: 'healthy' }));
  });
});
