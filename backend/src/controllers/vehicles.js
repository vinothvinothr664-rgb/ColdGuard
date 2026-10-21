import Vehicle from '../models/Vehicle.js';
import Shipment from '../models/Shipment.js';
import AuditLog from '../models/AuditLog.js';
export async function list(req, res) { res.json(await Vehicle.find().sort({ vehicleId: 1 }).lean()); }
export async function create(req, res) {
  const b = req.body || {};
  if (typeof b.vehicleId !== 'string' || !b.vehicleId.trim()) return res.status(400).json({ message: 'Vehicle ID is required' });
  if (b.shipmentId && !(await Shipment.findOne({ shipmentId: b.shipmentId }))) return res.status(400).json({ message: 'Assigned shipment does not exist' });
  const v = await Vehicle.create({ vehicleId: b.vehicleId.trim(), vehicleNumber: String(b.vehicleNumber || '').trim(), driverName: String(b.driverName || '').trim(), shipmentId: String(b.shipmentId || '').trim(), status: ['AVAILABLE', 'ON_ROUTE', 'MAINTENANCE'].includes(b.status) ? b.status : 'AVAILABLE' });
  await AuditLog.create({ action: 'VEHICLE_CREATED', entity: 'Vehicle', entityId: v.vehicleId, userId: req.user.id, userEmail: req.user.email });
  res.status(201).json(v);
}
