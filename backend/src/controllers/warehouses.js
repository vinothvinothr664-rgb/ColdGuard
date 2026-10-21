import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import AuditLog from '../models/AuditLog.js';
import SensorReading from '../models/SensorReading.js';
import Shipment from '../models/Shipment.js';
import Warehouse from '../models/Warehouse.js';

const statuses = ['ACTIVE', 'MAINTENANCE', 'INACTIVE'];

async function validateShipmentIds(shipmentIds) {
  if (!Array.isArray(shipmentIds) || shipmentIds.some(id => typeof id !== 'string')) {
    return { error: 'Shipment assignments must be a list of shipment IDs' };
  }
  const normalized = [...new Set(shipmentIds.map(id => id.trim()).filter(Boolean))];
  const found = await Shipment.find({ shipmentId: { $in: normalized } }).distinct('shipmentId');
  if (found.length !== normalized.length) return { error: 'One or more assigned shipments do not exist' };
  return { shipmentIds: normalized };
}

function validatePayload(body, partial = false) {
  const payload = {};
  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) {
      return { error: 'Warehouse name is required and must be 100 characters or fewer' };
    }
    payload.name = body.name.trim();
  }
  if (!partial || body.location !== undefined) {
    if (typeof body.location !== 'string' || !body.location.trim() || body.location.trim().length > 200) {
      return { error: 'Location is required and must be 200 characters or fewer' };
    }
    payload.location = body.location.trim();
  }
  if (!partial || body.capacity !== undefined) {
    const capacity = Number(body.capacity);
    if (body.capacity === '' || !Number.isFinite(capacity) || capacity <= 0) {
      return { error: 'Storage capacity must be a positive number' };
    }
    payload.capacity = capacity;
  }
  if (!partial || body.capacityUnit !== undefined) {
    const capacityUnit = body.capacityUnit === undefined ? 'pallets' : body.capacityUnit;
    if (typeof capacityUnit !== 'string' || !capacityUnit.trim() || capacityUnit.trim().length > 20) {
      return { error: 'Capacity unit is required and must be 20 characters or fewer' };
    }
    payload.capacityUnit = capacityUnit.trim();
  }
  if (body.status !== undefined) {
    if (!statuses.includes(body.status)) return { error: 'Invalid warehouse status' };
    payload.status = body.status;
  } else if (!partial) {
    payload.status = 'ACTIVE';
  }
  if (body.shipmentIds !== undefined) payload.shipmentIds = body.shipmentIds;
  else if (!partial) payload.shipmentIds = [];
  return { payload };
}

export async function list(req, res) {
  const warehouses = await Warehouse.find().sort({ name: 1 }).lean();
  const shipmentIds = [...new Set(warehouses.flatMap(warehouse => warehouse.shipmentIds || []))];
  if (!shipmentIds.length) {
    return res.json(warehouses.map(warehouse => ({ ...warehouse, telemetry: null, activeAlerts: [] })));
  }

  const [latestReadings, activeAlerts] = await Promise.all([
    SensorReading.aggregate([
      { $match: { shipmentId: { $in: shipmentIds } } },
      { $sort: { timestamp: -1 } },
      { $group: {
        _id: '$shipmentId',
        temperature: { $first: '$temperature' },
        humidity: { $first: '$humidity' },
        status: { $first: '$status' },
        timestamp: { $first: '$timestamp' }
      } }
    ]),
    Alert.find({ shipmentId: { $in: shipmentIds }, resolved: false })
      .select('shipmentId type severity message timestamp')
      .sort({ timestamp: -1 })
      .lean()
  ]);
  const readingsByShipment = new Map(latestReadings.map(reading => [reading._id, reading]));
  const alertsByShipment = new Map();
  for (const alert of activeAlerts) {
    const list = alertsByShipment.get(alert.shipmentId) || [];
    list.push(alert);
    alertsByShipment.set(alert.shipmentId, list);
  }
  res.json(warehouses.map(warehouse => {
    const linkedReadings = (warehouse.shipmentIds || [])
      .map(id => readingsByShipment.get(id))
      .filter(Boolean)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return {
      ...warehouse,
      telemetry: linkedReadings[0] || null,
      activeAlerts: (warehouse.shipmentIds || []).flatMap(id => alertsByShipment.get(id) || [])
    };
  }));
}

export async function create(req, res) {
  const { payload, error } = validatePayload(req.body || {});
  if (error) return res.status(400).json({ message: error });
  const assignments = await validateShipmentIds(payload.shipmentIds);
  if (assignments.error) return res.status(400).json({ message: assignments.error });
  payload.shipmentIds = assignments.shipmentIds;
  const warehouse = await Warehouse.create(payload);
  await AuditLog.create({
    action: 'WAREHOUSE_CREATED', entity: 'Warehouse', entityId: String(warehouse._id),
    userId: req.user.id, userEmail: req.user.email
  });
  res.status(201).json(warehouse);
}

export async function update(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid warehouse ID' });
  const { payload, error } = validatePayload(req.body || {}, true);
  if (error) return res.status(400).json({ message: error });
  if (payload.shipmentIds !== undefined) {
    const assignments = await validateShipmentIds(payload.shipmentIds);
    if (assignments.error) return res.status(400).json({ message: assignments.error });
    payload.shipmentIds = assignments.shipmentIds;
  }
  const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
  await AuditLog.create({
    action: 'WAREHOUSE_UPDATED', entity: 'Warehouse', entityId: String(warehouse._id),
    userId: req.user.id, userEmail: req.user.email
  });
  res.json(warehouse);
}

export async function remove(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid warehouse ID' });
  const warehouse = await Warehouse.findByIdAndDelete(req.params.id);
  if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
  await AuditLog.create({
    action: 'WAREHOUSE_DELETED', entity: 'Warehouse', entityId: String(warehouse._id),
    userId: req.user.id, userEmail: req.user.email, details: { name: warehouse.name }
  });
  res.json({ message: 'Warehouse deleted' });
}
