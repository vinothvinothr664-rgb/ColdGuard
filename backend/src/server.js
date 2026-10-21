import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import User from './models/User.js';
import Shipment from './models/Shipment.js';
import Vehicle from './models/Vehicle.js';

// Resolve backend/.env relative to this file, not the shell's current directory.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(x => x.trim());
app.use(cors({ origin: (origin, cb) => !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('Origin not allowed by CORS')) }));
app.use(express.json({ limit: '100kb' }));
app.get('/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  return res.status(databaseReady ? 200 : 503).json({ status: databaseReady ? 'ok' : 'degraded', service: 'cold-chain-backend', database: databaseReady ? 'connected' : 'disconnected' });
});
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

async function seed() {
  const password = process.env.DEMO_PASSWORD || 'ColdGuard@123';
  if (password.length < 10) throw new Error('DEMO_PASSWORD must be at least 10 characters');
  const demoUsers = [
    { name: 'Admin', email: 'admin@coldchain.local', role: 'admin' },
    { name: 'Manager', email: 'manager@coldchain.local', role: 'manager' },
    { name: 'Operator', email: 'operator@coldchain.local', role: 'operator' },
    { name: 'Viewer', email: 'viewer@coldchain.local', role: 'viewer' }
  ];
  for (const entry of demoUsers) {
    if (!(await User.findOne({ email: entry.email }))) await User.create({ ...entry, password: await bcrypt.hash(password, 12) });
  }
  if (!(await Shipment.findOne({ shipmentId: 'SH001' }))) await Shipment.create({ shipmentId: 'SH001', productName: 'Temperature-Sensitive Medicine', source: 'Chennai Distribution Center', destination: 'Bangalore Hospital', vehicleId: 'VH001', temperatureMin: 2, temperatureMax: 8, status: 'IN_TRANSIT' });
  if (!(await Vehicle.findOne({ vehicleId: 'VH001' }))) await Vehicle.create({ vehicleId: 'VH001', vehicleNumber: 'TN-01-CG-001', driverName: 'Demo Driver', shipmentId: 'SH001', status: 'ON_ROUTE', currentLocation: { latitude: 13.0827, longitude: 80.2707 } });
}

const port = Number(process.env.PORT || 5000);
if (process.env.NODE_ENV !== 'test') {
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in backend/.env (for local MongoDB, use mongodb://127.0.0.1:27017/cold_chain)');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /replace-this|change-me|example/i.test(process.env.JWT_SECRET)) throw new Error('Set JWT_SECRET to a unique random value of at least 32 characters in backend/.env');
  if (!process.env.SENSOR_API_KEY || process.env.SENSOR_API_KEY.length < 16 || /replace-this|change-me|example/i.test(process.env.SENSOR_API_KEY)) throw new Error('Set SENSOR_API_KEY to a unique random value of at least 16 characters in backend/.env');
  connectDB().then(seed).then(() => app.listen(port, () => console.log(`ColdGuard backend listening at http://localhost:${port}`))).catch(error => { console.error('Startup failed:', error.message); process.exit(1); });
}
export default app;
