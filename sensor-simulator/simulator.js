import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config({ path: new URL('../backend/.env', import.meta.url) });
const API = process.env.API_URL || 'http://localhost:5000/api';
const SENSOR_API_KEY = process.env.SENSOR_API_KEY || '';
const shipmentId = process.env.SHIPMENT_ID || 'SH001';
const mode = process.env.MODE || 'demo';
let i = 0;
function value() {
  if (mode === 'demo') { const seq = [4.2, 4.5, 5.1, 5.6, 6.2, 7.5, 8.6, 9.4, 7.0, 5.2]; return seq[i++ % seq.length]; }
  return 4.5 + Math.sin(Date.now() / 10000) + Math.random() * 0.6;
}
async function send() {
  const temperature = Number(value().toFixed(1));
  const humidity = Number((60 + Math.random() * 12).toFixed(1));
  const body = { shipmentId, temperature, humidity, latitude: 13.0827 + (Math.random() - 0.5) * 0.03, longitude: 80.2707 + (Math.random() - 0.5) * 0.03 };
  try { const r = await axios.post(`${API}/sensor/readings`, body, { headers: { 'x-sensor-key': SENSOR_API_KEY }, timeout: 5000 }); console.log(new Date().toISOString(), body, r.data.reading.status, r.data.ai.reason); }
  catch (e) { console.error(e.response?.data || e.message); }
}
console.log(`ColdGuard simulator targeting ${API}; shipment=${shipmentId}; mode=${mode}`);
if (!SENSOR_API_KEY) { console.error('SENSOR_API_KEY is missing. Configure backend/.env first.'); process.exit(1); }
send(); setInterval(send, 5000);
