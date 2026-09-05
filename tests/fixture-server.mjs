/** Isolated, in-memory UI test fixture. Never used by npm start or production builds. */
import { createServer } from 'node:http';
const now = new Date().toISOString();
const row = (id, values) => ({
  id,
  is_active: true,
  created_at: now,
  updated_at: now,
  ...values,
});
const stores = {
  roles: [row(1, { name: 'admin' }), row(2, { name: 'student' }), row(3, { name: 'staff' })],
  users: [
    row(1, {
      fullname: 'Demo Administrator',
      username: 'demo',
      email: 'demo@example.com',
      role_id: 1,
      type: 'admin',
      department_id: null,
    }),
  ],
  shops: ['The Daily Grind', 'Nasi & Co.', 'Green Bowl Kitchen', 'Campus Bakes'].map(
    (name, index) =>
      row(index + 1, {
        name,
        location: [
          'Block A · Ground floor',
          'Block B · Level 1',
          'Block A · Courtyard',
          'Block C · Ground floor',
        ][index],
        email: `shop${index + 1}@example.com`,
        description: 'Isolated browser test fixture',
        logo_url: null,
        open_at: null,
        close_at: null,
      }),
  ),
  categories: ['Coffee & drinks', 'Local favourites', 'Healthy bites', 'Bakery'].map(
    (name, index) => row(index + 1, { name, description: 'Campus dining' }),
  ),
  genres: Array.from({ length: 13 }, (_, index) =>
    row(index + 1, { name: `Cuisine ${index + 1}`, is_active: index !== 3 }),
  ),
  'payment-methods': [
    row(1, {
      name: 'DuitNow QR',
      type: 'qr',
      description: 'Scan to pay',
      logo: null,
      domain_url: null,
    }),
    row(2, { name: 'Cash', type: 'cash' }),
  ],
  staffs: [
    row(1, {
      shop_id: 1,
      name: 'Demo Staff',
      email: 'staff@example.com',
      phone: '+60 12 345 6789',
    }),
  ],
  'payment-accounts': [
    row(1, {
      shop_id: 1,
      payment_method_id: 1,
      account_holder_name: 'The Daily Grind',
      account_number: '0012345678',
      image: null,
    }),
  ],
};
let access = '';
let refresh = '';
let sequence = 0;
const tokens = () => ({
  access_token: (access = `fixture-access-${++sequence}`),
  refresh_token: (refresh = `fixture-refresh-${sequence}`),
  expires_in: 3600,
  refresh_expires_in: 604800,
  token_type: 'Bearer',
});
const optionKeys = {
  'role-options': 'roles',
  'category-options': 'categories',
  'genre-options': 'genres',
  'payment-method-options': 'payment-methods',
};
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const send = (status, data = null, message = 'OK', extra = {}) => {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'X-Test-Fixture': 'true',
    });
    response.end(
      JSON.stringify({
        success: status < 400,
        message,
        ...(data === null ? {} : { data }),
        ...extra,
      }),
    );
  };
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  let body = {};
  if (request.headers['content-type']?.includes('application/json')) {
    try {
      body = JSON.parse(raw);
    } catch {
      send(400, null, 'Invalid JSON');
      return;
    }
  }
  if (url.pathname === '/cafeteria/health') {
    send(200, { status: 'healthy' });
    return;
  }
  if (url.pathname.startsWith('/cafeteria/uploads/')) {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Isolated fixture upload');
    return;
  }
  const path = url.pathname.replace('/cafeteria/admin/', '');
  if (path === 'auth/login') {
    if (body.email !== 'demo@example.com' || body.password !== 'DemoPass123!') {
      send(401, null, 'Invalid credentials');
      return;
    }
    send(200, { ...tokens(), user: stores.users[0], role: 'admin' }, 'Login successful');
    return;
  }
  if (path === 'auth/refresh-token') {
    if (body.refresh_token !== refresh || !refresh) {
      send(401, null, 'Invalid refresh token');
      return;
    }
    send(200, tokens(), 'Token refreshed successfully');
    return;
  }
  if (!access || request.headers.authorization !== `Bearer ${access}`) {
    send(401, null, 'Invalid token');
    return;
  }
  if (path === 'auth/profile') {
    send(200, { ...stores.users[0], role: 'admin' });
    return;
  }
  if (path === 'auth/logout' || path === 'auth/revoke-token') {
    access = '';
    send(200, null, 'Signed out');
    return;
  }
  if (path === 'uploads' && request.method === 'POST') {
    if (!raw.includes('name="file"')) {
      send(422, null, 'A file is required');
      return;
    }
    const filename = /filename="([^"]+)"/.exec(raw)?.[1] || 'file.png';
    send(
      201,
      {
        filename: `fixture-${filename}`,
        original_filename: filename,
        path: `uploads/fixture-${filename}`,
        url: `/cafeteria/uploads/fixture-${filename}`,
      },
      'File uploaded',
    );
    return;
  }
  if (optionKeys[path]) {
    send(
      200,
      stores[optionKeys[path]]
        .filter((item) => item.is_active)
        .map(({ id, name }) => ({ id, name })),
    );
    return;
  }
  const nested = /^shops\/(\d+)\/(staffs|payment-accounts)(?:\/(\d+))?$/.exec(path);
  const parts = path.split('/');
  const key = nested?.[2] || parts[0];
  const id = Number(nested ? nested[3] : parts[1]);
  const shopId = nested ? Number(nested[1]) : undefined;
  if (!stores[key]) {
    send(404, null, 'Not found');
    return;
  }
  const items = stores[key].filter((item) => !shopId || item.shop_id === shopId);
  const existing = id ? items.find((item) => item.id === id) : undefined;
  if (id && !existing) {
    send(404, null, 'Record not found');
    return;
  }
  if (request.method === 'GET' && id) {
    send(200, existing);
    return;
  }
  if (request.method === 'GET') {
    let filtered = items;
    const allowed = [
      'page',
      'per_page',
      'search',
      'is_active',
      'role_id',
      'department_id',
      'type',
      'payment_method_id',
    ];
    if ([...url.searchParams.keys()].some((key) => !allowed.includes(key))) {
      send(422, null, 'Unknown filter');
      return;
    }
    for (const [key, value] of url.searchParams) {
      if (key === 'search' && value)
        filtered = filtered.filter((item) =>
          JSON.stringify(item).toLowerCase().includes(value.toLowerCase()),
        );
      else if (!['page', 'per_page', 'search'].includes(key) && value !== '')
        filtered = filtered.filter((item) => String(item[key]) === value);
    }
    const page = Number(url.searchParams.get('page') || 1),
      perPage = Number(url.searchParams.get('per_page') || 20),
      total = filtered.length;
    send(200, filtered.slice((page - 1) * perPage, page * perPage), 'OK', {
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
        has_next: page * perPage < total,
        has_previous: page > 1,
      },
    });
    return;
  }
  if (request.method === 'DELETE') {
    stores[key] = stores[key].filter((item) => item.id !== id);
    send(200, null, 'Deleted');
    return;
  }
  if (body.name === 'duplicate') {
    send(409, null, 'This name already exists');
    return;
  }
  if (body.name === 'invalid') {
    send(422, null, 'Validation failed', {
      errors: { name: 'This name is not allowed' },
    });
    return;
  }
  delete body.password;
  if (request.method === 'PUT') {
    Object.assign(existing, body, { updated_at: now });
    send(200, existing, 'Updated');
    return;
  }
  if (request.method === 'POST') {
    const record = row(Math.max(0, ...stores[key].map((item) => item.id)) + 1, {
      ...body,
      ...(shopId ? { shop_id: shopId } : {}),
    });
    stores[key].unshift(record);
    send(201, record, 'Created');
    return;
  }
  send(405, null, 'Method not allowed');
});
server.listen(18000, '127.0.0.1', () =>
  console.log(
    'Isolated UI fixture: http://127.0.0.1:18000. Login: demo@example.com / DemoPass123! (not real credentials).',
  ),
);
