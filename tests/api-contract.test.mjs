/** Read-only smoke checks against the actual backend; no credentials or database mutations. */
import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.API_TEST_BASE || 'http://127.0.0.1:8000/cafeteria';
test('public health endpoint matches the frontend contract', async () => {
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'healthy');
});
test('admin data is protected without a token', async () => {
  const response = await fetch(`${base}/admin/roles`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).success, false);
});
