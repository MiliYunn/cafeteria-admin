import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export interface Field {
  key: string;
  label: string;
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'textarea'
    | 'checkbox'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'url'
    | 'time';
  required?: boolean;
  min?: number;
  max?: number;
  options?: string;
  hint?: string;
  upload?: boolean;
  preview?: 'image';
  choices?: ReadonlyArray<{ label: string; value: string }>;
}
export interface Column {
  key: string;
  label: string;
  kind?: 'date' | 'status';
}
export interface Resource {
  key: string;
  title: string;
  singular: string;
  description: string;
  icon: string;
  fields: Field[];
  columns: Column[];
  filters: Field[];
  optionEndpoint?: string;
  nested?: boolean;
}
const name = (max = 100): Field => ({
  key: 'name',
  label: 'Name',
  required: true,
  max,
});
const active: Field = { key: 'is_active', label: 'Active', type: 'checkbox' };
const description: Field = {
  key: 'description',
  label: 'Description',
  type: 'textarea',
  max: 5000,
};
const password: Field = {
  key: 'password',
  label: 'Password',
  type: 'password',
  required: true,
  min: 8,
  max: 128,
  hint: 'Leave blank when editing to keep the existing password.',
};
const email: Field = {
  key: 'email',
  label: 'Email address',
  type: 'email',
  required: true,
  max: 255,
};
const type: Field = { key: 'type', label: 'Type', required: true, max: 50 };
const paymentMethodType: Field = {
  key: 'type',
  label: 'Type',
  type: 'radio',
  required: true,
  choices: [
    { label: 'Bank', value: 'bank' },
    { label: 'Wallet', value: 'wallet' },
    { label: 'Card', value: 'card' },
    { label: 'Cash', value: 'cash' },
  ],
};
const status: Column = { key: 'is_active', label: 'Status', kind: 'status' };
const updated: Column = {
  key: 'updated_at',
  label: 'Last updated',
  kind: 'date',
};
const basicColumns: Column[] = [{ key: 'name', label: 'Name' }, status, updated];
const url = (key: string, label: string, upload = true, preview?: 'image'): Field => ({
  key,
  label,
  type: 'url',
  max: 500,
  upload,
  preview,
  hint: 'Use an HTTPS URL or a /cafeteria/uploads/ path.',
});
const id = (key: string, label: string, options?: string, required = false): Field => ({
  key,
  label,
  type: options ? 'select' : 'number',
  options,
  required,
});

export const RESOURCES: Record<string, Resource> = {
  roles: {
    key: 'roles',
    title: 'Roles',
    singular: 'role',
    description: 'Define access levels for your campus community.',
    icon: 'roles',
    fields: [name(50), active],
    columns: basicColumns,
    filters: [],
    optionEndpoint: 'role-options',
  },
  users: {
    key: 'users',
    title: 'Users',
    singular: 'user',
    description: 'The people who make your campus work.',
    icon: 'users',
    fields: [
      { key: 'fullname', label: 'Full name', required: true, max: 255 },
      { key: 'username', label: 'Username', required: true, min: 3, max: 100 },
      email,
      id('role_id', 'Role', 'role-options', true),
      id('department_id', 'Department ID'),
      {
        ...type,
        hint: 'For example: admin, student, or staff. Access is determined by the assigned role.',
      },
      {
        ...password,
        hint: 'Use 8–15 characters for accounts that need to log in: the current login API accepts at most 15. Leave blank when editing to keep the password.',
      },
      active,
    ],
    columns: [
      { key: 'fullname', label: 'Full name' },
      { key: 'email', label: 'Email address' },
      { key: 'type', label: 'Type' },
      status,
      updated,
    ],
    filters: [
      id('role_id', 'Role', 'role-options'),
      id('department_id', 'Department ID'),
      { ...type, required: false },
    ],
  },
  categories: {
    key: 'categories',
    title: 'Categories',
    singular: 'category',
    description: 'Keep campus shops thoughtfully organised.',
    icon: 'categories',
    fields: [name(), description, active],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      status,
      updated,
    ],
    filters: [],
    optionEndpoint: 'category-options',
  },
  genres: {
    key: 'genres',
    title: 'Genres',
    singular: 'genre',
    description: 'A little variety for every appetite.',
    icon: 'genres',
    fields: [name(), active],
    columns: basicColumns,
    filters: [],
    optionEndpoint: 'genre-options',
  },
  'payment-methods': {
    key: 'payment-methods',
    title: 'Payment methods',
    singular: 'payment method',
    description: 'Manage the ways your campus can pay.',
    icon: 'payment-methods',
    fields: [
      name(),
      paymentMethodType,
      description,
      url('logo', 'Logo', true, 'image'),
      url('domain_url', 'Website URL', false),
      active,
    ],
    columns: [{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, status, updated],
    filters: [{ ...type, required: false }],
    optionEndpoint: 'payment-method-options',
  },
  shops: {
    key: 'shops',
    title: 'Shops',
    singular: 'shop',
    description: 'A home for every flavour on campus.',
    icon: 'shops',
    fields: [
      name(150),
      { key: 'location', label: 'Location', required: true, max: 255 },
      email,
      password,
      description,
      url('logo_url', 'Shop logo', true, 'image'),
      { ...url('domain_url', 'Shop portal URL', false), required: true },
      {
        key: 'category_ids',
        label: 'Shop categories',
        type: 'multiselect',
        options: 'category-options',
        hint: 'Select one or more categories that describe this shop.',
      },
      {
        key: 'open_at',
        label: 'Opens at',
        type: 'time',
        hint: 'Local shop time only. Leave blank if hours are not set.',
      },
      { key: 'close_at', label: 'Closes at', type: 'time' },
      active,
    ],
    columns: [
      { key: 'name', label: 'Shop name' },
      { key: 'location', label: 'Location' },
      { key: 'email', label: 'Email address' },
      { key: 'domain_url', label: 'Portal URL' },
      { key: 'login_url', label: 'Login URL' },
      status,
      updated,
    ],
    filters: [],
  },
};

export function fieldValidators(field: Field, editing: boolean): ValidatorFn[] {
  const rules: ValidatorFn[] = [];
  if (field.required && !(editing && field.type === 'password'))
    rules.push((control) =>
      typeof control.value === 'string'
        ? control.value.trim()
          ? null
          : { required: true }
        : Validators.required(control),
    );
  if (field.max) rules.push(Validators.maxLength(field.max));
  if (field.min) rules.push(Validators.minLength(field.min));
  if (field.type === 'email') rules.push(Validators.email);
  if (field.choices)
    rules.push((control) =>
      !control.value || field.choices!.some((choice) => choice.value === control.value)
        ? null
        : { choice: true },
    );
  if (field.type === 'time')
    rules.push(Validators.pattern(/^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/));
  if (field.type === 'number' || field.type === 'select')
    rules.push((control: AbstractControl): ValidationErrors | null =>
      control.value === '' ||
      control.value == null ||
      (Number.isSafeInteger(Number(control.value)) && Number(control.value) > 0)
        ? null
        : { positive: true },
    );
  if (field.type === 'url')
    rules.push((control) => {
      if (!control.value || String(control.value).startsWith('/cafeteria/uploads/')) return null;
      try {
        const url = new URL(control.value);
        return ['http:', 'https:'].includes(url.protocol) ? null : { url: true };
      } catch {
        return { url: true };
      }
    });
  return rules;
}

export function resourcePayload(
  fields: Field[],
  values: Record<string, any>,
  editing: boolean,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const field of fields) {
    let value = values[field.key];
    if (typeof value === 'string') value = value.trim();
    if (editing && field.type === 'password' && !value) continue;
    if (field.type === 'checkbox') value = Boolean(value);
    else if (value === '' || value == null) value = null;
    else if (field.type === 'number' || field.type === 'select') value = Number(value);
    else if (field.type === 'multiselect') value = Array.isArray(value) ? value.map(Number) : [];
    else if (field.type === 'time' && value.length === 5) value += ':00';
    result[field.key] = value;
  }
  return result;
}
