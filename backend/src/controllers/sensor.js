import SensorReading from '../models/SensorReading.js';
import Shipment from '../models/Shipment.js';
import Alert from '../models/Alert.js';
import { analyze } from '../services/ai.js';
export async function create(req, res) {
  const configuredKey = process.env.SENSOR_API_KEY;
  if (!configuredKey || !req.headers['x-sensor-key'] || req.headers['x-sensor-key'] !== configuredKey) return res.status(401).json({ message: 'Valid sensor API key required' });
  const { shipmentId, temperature, humidity, latitude, longitude, timestamp } = req.body || {};
  if (typeof shipmentId !== 'string' || !shipmentId.trim() || !Number.isFinite(temperature) || !Number.isFinite(humidity)) return res.status(400).json({ message: 'shipmentId, numeric temperature and numeric humidity are required' });
  if (temperature < -100 || temperature > 100 || humidity < 0 || humidity > 100) return res.status(400).json({ message: 'Temperature or humidity is outside valid sensor bounds' });
  if ((latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) return res.status(400).json({ message: 'Invalid GPS coordinates' });
  const parsedTimestamp = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(parsedTimestamp.getTime()) || parsedTimestamp > new Date(Date.now() + 5 * 60 * 1000)) return res.status(400).json({ message: 'Invalid timestamp' });
  const shipment = await Shipment.findOne({ shipmentId: shipmentId.trim() });
  if (!shipment) return res.status(404).json({ message: 'Shipment not found' });
  let status = 'NORMAL';
  if (temperature > shipment.temperatureMax || temperature < shipment.temperatureMin) status = 'CRITICAL';
  else if (temperature >= shipment.temperatureMax - 1 || temperature <= shipment.temperatureMin + 1) status = 'WARNING';
  const recent = await SensorReading.find({ shipmentId: shipment.shipmentId }).sort({ timestamp: -1 }).limit(19).lean();
  const ai = await analyze([...recent.reverse().map(r => ({ temperature: r.temperature, humidity: r.humidity })), { temperature, humidity }]);
  const reading = await SensorReading.create({ shipmentId: shipment.shipmentId, temperature, humidity, latitude, longitude, status, timestamp: parsedTimestamp, anomaly: ai.anomaly, riskScore: ai.riskScore, anomalyReason: ai.reason });
  if (status !== 'NORMAL' || ai.anomaly) {
    const severity = status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
    const existing = await Alert.findOne({ shipmentId: shipment.shipmentId, resolved: false, type: ai.anomaly ? 'AI_ANOMALY' : 'TEMPERATURE' });
    if (!existing) await Alert.create({ shipmentId: shipment.shipmentId, type: ai.anomaly ? 'AI_ANOMALY' : 'TEMPERATURE', message: ai.reason || `Temperature ${temperature}°C outside safe range`, severity, temperature });
  }
  if (status === 'CRITICAL') await Shipment.updateOne({ shipmentId: shipment.shipmentId }, { status: 'AT_RISK' });
  res.status(201).json({ reading, ai });
}
export async function list(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '200', 10) || 200, 1), 500);
  const q = req.query.shipmentId ? { shipmentId: String(req.query.shipmentId) } : {};
  res.json(await SensorReading.find(q).sort({ timestamp: -1 }).limit(limit).lean());
}
