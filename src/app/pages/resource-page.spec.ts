import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ToastrService } from 'ngx-toastr';
import { ResourcePage } from './resource-page';
import { ADMIN_BASE } from '../core/api.service';

describe('CRUD workflow', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<ResourcePage>;
  const ok = (data: unknown) => ({ success: true, message: 'OK', data });
  function setup(resource = 'roles', shopId?: string) {
    TestBed.configureTestingModule({
      imports: [ResourcePage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ToastrService,
          useValue: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { resource },
              queryParamMap: convertToParamMap(shopId ? { shop_id: shopId } : {}),
            },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ResourcePage);
    return fixture.componentInstance;
  }
  const list = (path: string) =>
    http.expectOne(
      (request) => request.url === `${ADMIN_BASE}/${path}` && request.method === 'GET',
    );
  afterEach(() => http.verify());
  it('requests server pagination and preserves inactive filters', () => {
    const page = setup();
    const request = list('roles');
    expect(request.request.params.get('per_page')).toBe('10');
    request.flush(ok([]));
    page.status = 'false';
    page.search = 'member';
    page.filter();
    const filtered = list('roles');
    expect(filtered.request.params.get('is_active')).toBe('false');
    expect(filtered.request.params.get('search')).toBe('member');
    filtered.flush(ok([]));
  });
  it('validates before POST and maps server field errors', () => {
    const page = setup();
    list('roles').flush(ok([]));
    page.open('create');
    page.save();
    http.expectNone((r) => r.method === 'POST');
    page.form.patchValue({ name: 'invalid' });
    page.save();
    const create = http.expectOne(`${ADMIN_BASE}/roles`);
    expect(create.request.body).toEqual({ name: 'invalid', is_active: true });
    create.flush(
      { message: 'Validation failed', errors: { name: 'Name is unavailable' } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(page.form.controls['name'].hasError('server')).toBe(true);
    expect(page.dialog()).toBe('create');
  });
  it('loads a single record before editing and refreshes the list after saving', () => {
    const page = setup();
    list('roles').flush(ok([]));
    page.open('edit', { id: 2 });
    http.expectOne(`${ADMIN_BASE}/roles/2`).flush(ok({ id: 2, name: 'student', is_active: true }));
    page.form.patchValue({ name: 'member', is_active: false });
    page.save();
    const update = http.expectOne(`${ADMIN_BASE}/roles/2`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ name: 'member', is_active: false });
    update.flush(ok({ id: 2 }));
    list('roles').flush(ok([]));
    expect(page.dialog()).toBeNull();
  });
  it('retains time-only values when editing a shop and sends no calendar date', () => {
    const page = setup('shops');
    list('shops').flush(ok([]));
    page.open('edit', { id: 1 });
    http.expectOne(`${ADMIN_BASE}/shops/1`).flush(
      ok({
        id: 1,
        name: 'Shop',
        location: 'Campus',
        email: 'shop@example.com',
        domain_url: 'http://localhost:5174',
        is_active: true,
        open_at: '08:30:15',
        close_at: '22:00:00',
        category_ids: [2],
      }),
    );
    http.expectOne(`${ADMIN_BASE}/category-options`).flush(ok([{ id: 2, name: 'Café' }]));
    expect(page.form.controls['open_at'].value).toBe('08:30:15');
    fixture.detectChanges();
    const timeInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#field-open_at',
    )!;
    expect(timeInput.type).toBe('time');
    expect(timeInput.value).toBe('08:30:15');
    expect(timeInput.step).toBe('1');
    page.dialog.set('view');
    expect(() => fixture.detectChanges()).not.toThrow();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('08:30:15');
    page.dialog.set('edit');
    page.form.patchValue({ close_at: '00:00' });
    page.save();
    const update = http.expectOne(`${ADMIN_BASE}/shops/1`);
    expect(update.request.body.open_at).toBe('08:30:15');
    expect(update.request.body.close_at).toBe('00:00:00');
    expect(update.request.body).not.toHaveProperty('password');
    update.flush(ok({ id: 1 }));
    list('shops').flush(ok([]));
  });
  it('renders a shop logo as an image in the detail dialog', () => {
    const page = setup('shops');
    list('shops').flush(ok([]));
    page.open('view', { id: 4 });
    http.expectOne(`${ADMIN_BASE}/shops/4`).flush(
      ok({
        id: 4,
        name: 'Campus Café',
        logo_url: '/cafeteria/uploads/campus-cafe.png',
        category_ids: [1, 2],
        categories: [{ id: 1, name: 'Café' }],
        created_at: '2026-09-05T08:00:00',
        updated_at: '2026-09-05T09:00:00',
      }),
    );
    fixture.detectChanges();
    const image = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
      '.detail-image-preview',
    );
    expect(image?.getAttribute('src')).toBe('/cafeteria/uploads/campus-cafe.png');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      '/cafeteria/uploads/campus-cafe.png',
    );
    expect(page.details().map((item) => item.key)).not.toEqual(
      expect.arrayContaining(['category_ids', 'categories', 'created_at', 'updated_at']),
    );
  });
});
