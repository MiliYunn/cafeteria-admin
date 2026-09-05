import { Component, DestroyRef, OnDestroy, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { Subscription, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { ApiService, Entity, Option, Pagination, errorMessage } from '../core/api.service';
import { ActivityService } from '../core/activity.service';
import { Field, RESOURCES, fieldValidators, resourcePayload } from '../core/resources';
import { Icon } from '../shared/icon';
import { Dialog } from '../shared/dialog';
import { validateFile } from '../shared/upload-validation';

@Component({
  selector: 'app-resource-page',
  imports: [Icon, Dialog, FormsModule, ReactiveFormsModule, DatePipe, TitleCasePipe, RouterLink],
  templateUrl: './resource-page.html',
})
export class ResourcePage implements OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastrService);
  private activity = inject(ActivityService);
  private destroyRef = inject(DestroyRef);
  readonly config = RESOURCES[this.route.snapshot.data['resource']];
  rows = signal<Entity[]>([]);
  loading = signal(false);
  error = signal('');
  busy = signal(false);
  formError = signal('');
  pagination = signal<Pagination>({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  });
  page = 1;
  perPage = 10;
  search = '';
  status = '';
  extra: Record<string, string> = {};
  shops = signal<Entity[]>([]);
  shopId = '';
  shopSearch = '';
  shopPage = 1;
  moreShops = signal(false);
  shopLoading = signal(false);
  shopError = signal('');
  options = signal<Record<string, Option[]>>({});
  optionsError = signal('');
  optionList = signal<Option[] | null>(null);
  dialog = signal<'create' | 'edit' | 'view' | 'delete' | null>(null);
  selected = signal<Entity | null>(null);
  uploading = signal('');
  previewUrls = signal<Record<string, string>>({});
  form = new FormGroup<Record<string, FormControl<any>>>({});
  private listRequest?: Subscription;
  constructor() {
    inject(Title).setTitle(`${this.config.title} · APCafeteria`);
    this.extra = Object.fromEntries(this.config.filters.map((field) => [field.key, '']));
    for (const field of this.config.filters) if (field.options) this.loadOptions(field.options);
    if (this.config.nested) {
      const id = this.route.snapshot.queryParamMap.get('shop_id');
      if (id && /^[1-9]\d*$/.test(id)) this.shopId = id;
      this.loadShops();
      if (this.shopId) this.load();
    } else this.load();
  }
  ngOnDestroy() {
    this.listRequest?.unsubscribe();
    this.clearPreviews();
  }
  path() {
    return this.config.nested ? `shops/${this.shopId}/${this.config.key}` : this.config.key;
  }
  load() {
    if (this.config.nested && !this.shopId) return;
    this.listRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    const query: Record<string, string | number> = {
      page: this.page,
      per_page: this.perPage,
      search: this.search.trim(),
      is_active: this.status,
      ...this.extra,
    };
    this.listRequest = this.api
      .get<Entity[]>(this.path(), query)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.rows.set(response.data);
          if (response.pagination) this.pagination.set(response.pagination);
          if (
            !response.data.length &&
            this.page > 1 &&
            response.pagination &&
            this.page > response.pagination.total_pages
          ) {
            this.page = Math.max(1, response.pagination.total_pages);
            this.load();
          }
        },
        error: (error) => {
          this.rows.set([]);
          this.error.set(errorMessage(error));
        },
      });
  }
  filter() {
    this.page = 1;
    this.load();
  }
  reset() {
    this.search = '';
    this.status = '';
    this.extra = Object.fromEntries(this.config.filters.map((field) => [field.key, '']));
    this.filter();
  }
  retryOptions() {
    for (const endpoint of new Set(
      [...this.config.fields, ...this.config.filters]
        .map((field) => field.options)
        .filter((value): value is string => !!value),
    ))
      this.loadOptions(endpoint, true);
  }
  changePage(direction: number) {
    this.page += direction;
    this.load();
  }
  loadShops(reset = false) {
    if (reset) this.shopPage = 1;
    this.shopLoading.set(true);
    this.shopError.set('');
    this.api
      .get<Entity[]>('shops', {
        page: this.shopPage,
        per_page: 100,
        search: this.shopSearch,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.shopLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.shops.set(response.data);
          this.moreShops.set(!!response.pagination?.has_next);
        },
        error: (error) => this.shopError.set(errorMessage(error)),
      });
  }
  changeShop() {
    this.page = 1;
    this.rows.set([]);
    if (this.shopId) this.load();
    else {
      this.listRequest?.unsubscribe();
      this.pagination.set({ ...this.pagination(), total: 0 });
    }
  }
  shopName() {
    return (
      this.shops().find((shop) => String(shop.id) === this.shopId)?.['name'] ||
      `Shop #${this.shopId}`
    );
  }
  loadOptions(endpoint: string, force = false) {
    if (this.options()[endpoint] && !force) return;
    this.optionsError.set('');
    this.api
      .get<Option[]>(endpoint)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.options.update((all) => ({ ...all, [endpoint]: response.data })),
        error: (error) => this.optionsError.set(errorMessage(error)),
      });
  }
  showOptions() {
    const endpoint = this.config.optionEndpoint;
    if (!endpoint) return;
    this.busy.set(true);
    this.api
      .get<Option[]>(endpoint)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (response) => this.optionList.set(response.data),
        error: (error) => this.toast.error(errorMessage(error)),
      });
  }
  open(mode: 'create' | 'edit' | 'view' | 'delete', row?: Entity) {
    this.formError.set('');
    if (mode === 'create') {
      this.selected.set(null);
      this.prepareForm();
      this.dialog.set(mode);
      return;
    }
    if (!row) return;
    if (mode === 'delete') {
      this.selected.set(row);
      this.dialog.set(mode);
      return;
    }
    this.busy.set(true);
    this.api
      .get<Entity>(`${this.path()}/${row.id}`)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.selected.set(response.data);
          if (mode === 'edit') this.prepareForm(response.data);
          this.dialog.set(mode);
        },
        error: (error) => this.toast.error(errorMessage(error)),
      });
  }
  prepareForm(entity?: Entity) {
    this.clearPreviews();
    const controls: Record<string, FormControl<any>> = {};
    for (const field of this.config.fields) {
      let value =
        entity?.[field.key] ??
        (field.type === 'checkbox' ? true : field.type === 'multiselect' ? [] : '');
      if (field.type === 'password') value = '';
      controls[field.key] = new FormControl(value, fieldValidators(field, !!entity));
      if (field.options) this.loadOptions(field.options, true);
    }
    this.form = new FormGroup(controls);
  }
  multiSelected(field: Field, optionId: number) {
    return (this.form.controls[field.key]?.value || []).map(Number).includes(optionId);
  }
  toggleMulti(field: Field, optionId: number, checked: boolean) {
    const control = this.form.controls[field.key];
    const current = new Set<number>((control.value || []).map(Number));
    if (checked) current.add(optionId);
    else current.delete(optionId);
    control.setValue([...current]);
    control.markAsTouched();
  }
  fieldError(field: Field): string {
    const control = this.form.controls[field.key];
    if (!control?.touched || !control.errors) return '';
    if (control.errors['server']) return control.errors['server'];
    if (field.type === 'time' && control.errors['pattern'])
      return 'Use 24-hour HH:MM or HH:MM:SS format (00:00–23:59:59).';
    if (control.errors['required']) return `${field.label} is required.`;
    if (control.errors['email']) return 'Enter a valid email address.';
    if (control.errors['minlength']) return `Use at least ${field.min} characters.`;
    if (control.errors['maxlength']) return `Use no more than ${field.max} characters.`;
    if (control.errors['positive']) return 'Enter a positive whole number.';
    if (control.errors['choice'])
      return `Choose one of the available ${field.label.toLowerCase()} options.`;
    if (control.errors['url']) return 'Enter an HTTP(S) URL or an uploaded file path.';
    return 'Check this value.';
  }
  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy() || this.uploading()) return;
    const editing = this.dialog() === 'edit';
    const payload = resourcePayload(this.config.fields, this.form.getRawValue(), editing);
    this.busy.set(true);
    this.formError.set('');
    const request = editing
      ? this.api.update(`${this.path()}/${this.selected()!.id}`, payload)
      : this.api.create(this.path(), payload);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          const title = `${this.config.singular} ${editing ? 'updated' : 'created'}`;
          this.toast.success('Your changes have been saved.', title);
          this.activity.add(
            title,
            String(
              payload['name'] ||
                payload['fullname'] ||
                payload['account_holder_name'] ||
                'Record saved',
            ),
          );
          this.dialog.set(null);
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          this.formError.set(errorMessage(error));
          for (const [key, value] of Object.entries(error.error?.errors || {})) {
            this.form.controls[key]?.setErrors({ server: String(value) });
            this.form.controls[key]?.markAsTouched();
          }
          this.toast.error(errorMessage(error));
        },
      });
  }
  remove() {
    this.busy.set(true);
    this.formError.set('');
    this.api
      .delete(`${this.path()}/${this.selected()!.id}`)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(`${this.config.singular} deleted.`);
          this.activity.add('Record deleted', `${this.config.title} · #${this.selected()!.id}`);
          this.dialog.set(null);
          this.load();
        },
        error: (error) => {
          this.formError.set(errorMessage(error));
          this.toast.error(errorMessage(error));
        },
      });
  }
  upload(event: Event, field: Field) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (field.preview === 'image' && !file.type.startsWith('image/')) {
      this.toast.error('Choose a JPG, PNG, WebP, or GIF image.');
      input.value = '';
      return;
    }
    const validation = validateFile(file);
    if (validation) {
      this.toast.error(validation);
      input.value = '';
      return;
    }
    if (field.preview === 'image') {
      this.clearPreview(field.key);
      const localUrl = URL.createObjectURL(file);
      this.previewUrls.update((all) => ({ ...all, [field.key]: localUrl }));
    }
    this.uploading.set(field.key);
    this.api
      .upload(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.uploading.set('');
          input.value = '';
        }),
      )
      .subscribe({
        next: (response) => {
          this.form.controls[field.key].setValue(response.data.url);
          this.clearPreview(field.key);
          this.toast.success('File uploaded. Save the form to attach it to this record.');
          this.activity.add('File uploaded', file.name);
        },
        error: (error) => {
          this.clearPreview(field.key);
          this.toast.error(errorMessage(error));
        },
      });
  }
  imagePreview(field: Field) {
    return this.previewUrls()[field.key] || this.form.controls[field.key]?.value || '';
  }
  isImageField(key: string) {
    return this.config.fields.some((field) => field.key === key && field.preview === 'image');
  }
  imageFailed(event: Event) {
    (event.target as HTMLImageElement).classList.add('image-load-error');
  }
  private clearPreview(key: string) {
    const current = this.previewUrls()[key];
    if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
    this.previewUrls.update((all) => {
      const next = { ...all };
      delete next[key];
      return next;
    });
  }
  private clearPreviews() {
    for (const key of Object.keys(this.previewUrls())) this.clearPreview(key);
  }
  details() {
    const hidden =
      this.config.key === 'shops'
        ? new Set(['password', 'category_ids', 'categories', 'created_at', 'updated_at'])
        : new Set(['password']);
    return Object.entries(this.selected() || {})
      .filter(([key]) => !hidden.has(key))
      .map(([key, value]) => ({ key, value }));
  }
  displayLabel(key: string) {
    return this.config.fields.find((field) => field.key === key)?.label || key.replaceAll('_', ' ');
  }
  display(value: unknown) {
    if (Array.isArray(value))
      return value
        .map((item) =>
          typeof item === 'object' && item !== null
            ? String(
                (item as Record<string, unknown>)['name'] ||
                  (item as Record<string, unknown>)['id'],
              )
            : String(item),
        )
        .join(', ');
    return value == null || value === ''
      ? '—'
      : typeof value === 'boolean'
        ? value
          ? 'Active'
          : 'Inactive'
        : String(value);
  }
  selectedLabel() {
    return (
      this.selected()?.['name'] ||
      this.selected()?.['fullname'] ||
      this.selected()?.['account_holder_name'] ||
      `#${this.selected()?.id}`
    );
  }
  firstItem() {
    return this.pagination().total ? (this.page - 1) * this.perPage + 1 : 0;
  }
  lastItem() {
    return Math.min(this.page * this.perPage, this.pagination().total);
  }
}
