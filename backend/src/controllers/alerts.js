import Alert from '../models/Alert.js';
import AuditLog from '../models/AuditLog.js';
export async function list(req, res) { res.json(await Alert.find().sort({ timestamp: -1 }).limit(500).lean()); }
export async function resolve(req, res) {
  const a = await Alert.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Alert not found' });
  if (a.resolved) return res.json(a);
  a.resolved = true; a.resolvedAt = new Date(); await a.save();
  await AuditLog.create({ action: 'ALERT_RESOLVED', entity: 'Alert', entityId: String(a._id), userId: req.user.id, userEmail: req.user.email, details: { shipmentId: a.shipmentId, type: a.type, severity: a.severity } });
  res.json(a);
}
