import { FormControl } from '@angular/forms';
import { RESOURCES, Field, fieldValidators, resourcePayload } from './resources';
import { validateFile } from '../shared/upload-validation';

describe('Admin resource contracts', () => {
  it('covers all six admin CRUD resources', () => {
    expect(Object.keys(RESOURCES)).toHaveLength(6);
  });
  it('exposes each of the four nonpaginated options endpoints', () => {
    expect(
      Object.values(RESOURCES)
        .map((r) => r.optionEndpoint)
        .filter(Boolean),
    ).toEqual(['role-options', 'category-options', 'genre-options', 'payment-method-options']);
  });
  it('does not send identifiers or timestamps in an edit payload', () => {
    expect(
      resourcePayload(
        RESOURCES['roles'].fields,
        { id: 4, name: '  Operator  ', is_active: false, created_at: 'now' },
        true,
      ),
    ).toEqual({ name: 'Operator', is_active: false });
  });
  it('omits unchanged passwords and converts foreign keys to numbers', () => {
    const payload = resourcePayload(
      RESOURCES['users'].fields,
      {
        fullname: 'User',
        username: 'user',
        email: 'user@example.com',
        role_id: '2',
        department_id: '',
        type: 'student',
        password: '',
        is_active: true,
      },
      true,
    );
    expect(payload['role_id']).toBe(2);
    expect(payload['department_id']).toBeNull();
    expect(payload).not.toHaveProperty('password');
  });
});

describe('Field validation', () => {
  const validate = (field: Field, value: unknown, editing = false) =>
    new FormControl(value, fieldValidators(field, editing));
  it('rejects whitespace-only required values', () => {
    expect(
      validate({ key: 'name', label: 'Name', required: true }, '   ').hasError('required'),
    ).toBe(true);
  });
  it('enforces backend name limits', () => {
    expect(validate(RESOURCES['roles'].fields[0], 'x'.repeat(51)).hasError('maxlength')).toBe(true);
  });
  it('validates email addresses', () => {
    expect(validate({ key: 'email', label: 'Email', type: 'email' }, 'invalid').invalid).toBe(true);
  });
  it('rejects zero, negative and fractional identifiers', () => {
    for (const value of [0, -1, 1.5, 'abc'])
      expect(validate({ key: 'id', label: 'ID', type: 'number' }, value).invalid).toBe(true);
  });
  it('allows an empty optional identifier', () => {
    expect(validate({ key: 'id', label: 'ID', type: 'number' }, '').valid).toBe(true);
  });
  it('requires a new password but allows blank on edit', () => {
    const field = RESOURCES['users'].fields.find((f) => f.key === 'password')!;
    expect(validate(field, '').invalid).toBe(true);
    expect(validate(field, '', true).valid).toBe(true);
    expect(validate(field, 'short', true).invalid).toBe(true);
  });
  it('accepts HTTP URLs and local uploads but blocks other schemes', () => {
    const field: Field = { key: 'logo', label: 'Logo', type: 'url' };
    for (const value of ['https://example.com/a.png', '/cafeteria/uploads/a.png'])
      expect(validate(field, value).valid).toBe(true);
    for (const value of ['javascript:alert(1)', 'file:///a.png', 'not a url'])
      expect(validate(field, value).invalid).toBe(true);
  });
  it('limits payment method types to the four supported radio values', () => {
    const field = RESOURCES['payment-methods'].fields.find((item) => item.key === 'type')!;
    expect(field.type).toBe('radio');
    expect(field.choices?.map((choice) => choice.value)).toEqual([
      'bank',
      'wallet',
      'card',
      'cash',
    ]);
    expect(validate(field, 'bank').valid).toBe(true);
    expect(validate(field, 'crypto').hasError('choice')).toBe(true);
  });
  it('configures shop categories as a category-options multiselect', () => {
    const field = RESOURCES['shops'].fields.find((item) => item.key === 'category_ids')!;
    expect(field.type).toBe('multiselect');
    expect(field.options).toBe('category-options');
    expect(resourcePayload([field], { category_ids: ['2', 4] }, false)).toEqual({
      category_ids: [2, 4],
    });
  });
  it('marks shop logos for image preview rendering', () => {
    const field = RESOURCES['shops'].fields.find((item) => item.key === 'logo_url')!;
    expect(field.upload).toBe(true);
    expect(field.preview).toBe('image');
  });
});

describe('Shop opening hours', () => {
  const fields = RESOURCES['shops'].fields.filter((field) =>
    ['open_at', 'close_at'].includes(field.key),
  );
  it('uses time pickers instead of date-time inputs', () => {
    expect(fields.map((field) => field.type)).toEqual(['time', 'time']);
  });
  it('accepts local times including midnight and rejects dates, offsets, and invalid hours', () => {
    for (const value of ['', '00:00', '08:30', '23:59:59'])
      expect(new FormControl(value, fieldValidators(fields[0], false)).valid).toBe(true);
    for (const value of ['2026-08-29T08:30', '08:30Z', '24:00', '12:60', '08:30:60', '08:30:00.1'])
      expect(new FormControl(value, fieldValidators(fields[0], false)).invalid).toBe(true);
  });
  it('normalizes minutes without timezone conversion and keeps seconds or null', () => {
    expect(resourcePayload(fields, { open_at: '08:30', close_at: '23:15:45' }, true)).toEqual({
      open_at: '08:30:00',
      close_at: '23:15:45',
    });
    expect(resourcePayload(fields, { open_at: '', close_at: null }, true)).toEqual({
      open_at: null,
      close_at: null,
    });
  });
});

describe('Upload validation', () => {
  it('accepts images and PDF files', () => {
    for (const name of ['logo.JPG', 'qr.png', 'shop.webp', 'image.gif', 'doc.pdf'])
      expect(validateFile({ name, size: 100 })).toBeNull();
  });
  it('blocks executables, oversized files, and empty files', () => {
    expect(validateFile({ name: 'x.exe', size: 1 })).toBeTruthy();
    expect(validateFile({ name: 'x.pdf', size: 5 * 1024 * 1024 + 1 })).toBeTruthy();
    expect(validateFile({ name: 'x.png', size: 0 })).toBeTruthy();
  });
});
