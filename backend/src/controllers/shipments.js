import Shipment from '../models/Shipment.js';
import AuditLog from '../models/AuditLog.js';
export async function create(req, res) {
  const b = req.body || {};
  if (![b.shipmentId, b.productName, b.source, b.destination].every(v => typeof v === 'string' && v.trim())) return res.status(400).json({ message: 'Shipment ID, product, origin and destination are required' });
  const min = Number(b.temperatureMin ?? 2), max = Number(b.temperatureMax ?? 8);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max || min < -100 || max > 100) return res.status(400).json({ message: 'Temperature range must be valid and minimum must be below maximum' });
  const payload = { shipmentId: b.shipmentId.trim(), productName: b.productName.trim(), source: b.source.trim(), destination: b.destination.trim(), vehicleId: String(b.vehicleId || '').trim(), temperatureMin: min, temperatureMax: max, status: 'PLANNED' };
  const s = await Shipment.create(payload);
  await AuditLog.create({ action: 'SHIPMENT_CREATED', entity: 'Shipment', entityId: s.shipmentId, userId: req.user.id, userEmail: req.user.email, details: { shipmentId: s.shipmentId } });
  res.status(201).json(s);
}
export async function list(req, res) { res.json(await Shipment.find().sort({ createdAt: -1 }).lean()); }
export async function getOne(req, res) { const s = await Shipment.findOne({ shipmentId: req.params.id }); if (!s) return res.status(404).json({ message: 'Shipment not found' }); res.json(s); }
