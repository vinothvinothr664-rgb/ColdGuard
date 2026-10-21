import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = path => readFile(new URL(path, import.meta.url), 'utf8');
test('public registration never accepts a client-selected role', async () => {
  const auth = await source('../src/controllers/auth.js');
  assert.match(auth, /role:\s*'viewer'/);
  assert.doesNotMatch(auth, /role:\s*req\.body\.role/);
});
test('admin management routes require authentication and admin role', async () => {
  const routes = await source('../src/routes/index.js');
  assert.match(routes, /get\('\/admin\/users', requireAuth, requireRole\('admin'\)/);
  assert.match(routes, /post\('\/admin\/users', requireAuth, requireRole\('admin'\)/);
  assert.match(routes, /patch\('\/admin\/users\/:id', requireAuth, requireRole\('admin'\)/);
  assert.match(routes, /get\('\/admin\/audit-logs', requireAuth, requireRole\('admin'\)/);
});
test('sensor ingestion requires a key and validates numeric readings', async () => {
  const sensor = await source('../src/controllers/sensor.js');
  assert.match(sensor, /x-sensor-key/);
  assert.match(sensor, /Number\.isFinite\(temperature\)/);
  assert.match(sensor, /Number\.isFinite\(humidity\)/);
  assert.match(sensor, /Valid sensor API key required/);
});
test('backend role permissions match the four required roles', async () => {
  const routes = await source('../src/routes/index.js');
  const model = await source('../src/models/User.js');
  for (const role of ['admin', 'manager', 'operator', 'viewer']) assert.ok(model.includes(`'${role}'`));
  assert.match(routes, /requireRole\('admin', 'manager', 'operator'\), alerts\.resolve/);
  assert.match(routes, /requireRole\('admin', 'manager'\), shipments\.create/);
  assert.match(routes, /requireRole\('admin', 'manager'\), vehicles\.create/);
});
test('JWT claims are checked against current account state', async () => {
  const auth = await source('../src/utils/auth.js');
  assert.match(auth, /User\.findById\(payload\.id\)/);
  assert.match(auth, /user\.active === false/);
  assert.match(auth, /payload\.tokenVersion/);
});

test('backend loads its env file relative to server.js and reports actual database readiness', async () => {
  const server = await source('../src/server.js');
  assert.match(server, /new URL\('\.\.\/\.env', import\.meta\.url\)/);
  assert.match(server, /import mongoose from 'mongoose'/);
  assert.match(server, /mongoose\.connection\.readyState === 1/);
  assert.match(server, /databaseReady \? 200 : 503/);
});

test('AI client has a bounded timeout and validates the response contract', async () => {
  const ai = await source('../src/services/ai.js');
  assert.match(ai, /AbortSignal\.timeout\(3000\)/);
  assert.match(ai, /Number\.isFinite\(result\.riskScore\)/);
  assert.match(ai, /AI service unavailable/);
});

test('warehouse writes require authenticated admin or manager roles', async () => {
  const routes = await source('../src/routes/index.js');
  assert.match(routes, /get\('\/warehouses', requireAuth, warehouses\.list\)/);
  assert.match(routes, /post\('\/warehouses', requireAuth, requireRole\('admin', 'manager'\), warehouses\.create\)/);
  assert.match(routes, /patch\('\/warehouses\/:id', requireAuth, requireRole\('admin', 'manager'\), warehouses\.update\)/);
  assert.match(routes, /delete\('\/warehouses\/:id', requireAuth, requireRole\('admin', 'manager'\), warehouses\.remove\)/);
});

test('warehouse telemetry is derived from linked shipment readings and unresolved alerts', async () => {
  const controller = await source('../src/controllers/warehouses.js');
  assert.match(controller, /SensorReading\.aggregate/);
  assert.match(controller, /Alert\.find\(\{ shipmentId: \{ \$in: shipmentIds \}, resolved: false \}\)/);
  assert.match(controller, /One or more assigned shipments do not exist/);
  assert.match(controller, /WAREHOUSE_DELETED/);
});
