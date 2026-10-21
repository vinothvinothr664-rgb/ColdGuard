import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './warehouses.css';
import {
  alertsApi, authApi, createShipmentApi, createVehicleApi, dashboardApi, readingsApi,
  resolveAlertApi, shipmentApi, shipmentsApi, vehiclesApi, adminUsersApi, createAdminUserApi, updateAdminUserApi, resetAdminPasswordApi, auditLogsApi,
  warehousesApi, createWarehouseApi, updateWarehouseApi, deleteWarehouseApi
} from './api';

const roleAccess = {
  admin: ['dashboard','monitoring','shipments','alerts','vehicles','warehouses','compliance','analytics','settings','users'],
  manager: ['dashboard','monitoring','shipments','alerts','vehicles','warehouses','compliance','analytics','settings'],
  operator: ['dashboard','monitoring','shipments','alerts','vehicles'],
  viewer: ['dashboard','monitoring','shipments','alerts','vehicles']
};

const nav = [
  ['dashboard', 'Dashboard', '▦'], ['monitoring', 'Live Monitoring', '◉'], ['shipments', 'Shipment Operations', '▤'],
  ['alerts', 'Alerts & Incidents', '⚠'], ['vehicles', 'Reefer Fleet', '▰'], ['warehouses', 'Cold Storage Hubs', '⌂'],
  ['compliance', 'Compliance', '✓'], ['analytics', 'Analytics', '⌁'], ['settings', 'Settings', '⚙'], ['users', 'User Administration', '♙']
];

function RoleRoute({ user, feature, children }) {
  const permissions = roleAccess[user?.role] || [];
  return permissions.includes(feature) ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('coldchain_user') || 'null'));
  const [toast, setToast] = useState('');
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();
  useEffect(() => { if (!user) return; const t = setInterval(() => setRefresh(x => x + 1), 10000); return () => clearInterval(t); }, [user]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); } }, [toast]);

  const login = async (email, password) => {
    try { const { data } = await authApi.login({ email, password }); localStorage.setItem('coldchain_token', data.token); localStorage.setItem('coldchain_user', JSON.stringify(data.user)); setUser(data.user); navigate('/dashboard'); }
    catch (e) { throw new Error(e.response?.data?.message || 'Login failed'); }
  };
  const logout = () => { localStorage.removeItem('coldchain_token'); localStorage.removeItem('coldchain_user'); setUser(null); navigate('/login'); };

  if (!user) return <Routes><Route path="/login" element={<Login onLogin={login} />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  return <>
    <Shell user={user} onLogout={logout} toast={toast}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard refresh={refresh} />} />
        <Route path="/monitoring" element={<RoleRoute user={user} feature="monitoring"><Monitoring refresh={refresh} toast={setToast} /></RoleRoute>} />
        <Route path="/shipments" element={<RoleRoute user={user} feature="shipments"><Shipments toast={setToast} user={user} /></RoleRoute>} />
        <Route path="/shipments/:id" element={<RoleRoute user={user} feature="shipments"><ShipmentDetail toast={setToast} /></RoleRoute>} />
        <Route path="/alerts" element={<RoleRoute user={user} feature="alerts"><Alerts toast={setToast} user={user} /></RoleRoute>} />
        <Route path="/vehicles" element={<RoleRoute user={user} feature="vehicles"><Vehicles toast={setToast} user={user} /></RoleRoute>} />
        <Route path="/warehouses" element={<RoleRoute user={user} feature="warehouses"><Warehouses user={user} refresh={refresh} /></RoleRoute>} />
        <Route path="/compliance" element={<RoleRoute user={user} feature="compliance"><Compliance refresh={refresh} /></RoleRoute>} />
        <Route path="/analytics" element={<RoleRoute user={user} feature="analytics"><Analytics refresh={refresh} /></RoleRoute>} />
        <Route path="/settings" element={<RoleRoute user={user} feature="settings"><Settings user={user} /></RoleRoute>} />
        <Route path="/users" element={<RoleRoute user={user} feature="users"><UserAdministration toast={setToast} /></RoleRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Shell>
  </>;
}

function Shell({ user, onLogout, children, toast }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const active = nav.find(([id]) => location.pathname.startsWith('/' + id))?.[0] || 'dashboard';
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">C</div><div><strong>ColdGuard</strong><span>Cold Chain Intelligence</span></div></div>
      <div className="env-pill"><span className="dot green"/> LIVE OPERATIONS</div>
      <nav>{nav.filter(([id]) => (roleAccess[user.role] || roleAccess.viewer).includes(id)).map(([id, label, icon]) => <NavLink key={id} to={'/' + id} className={({isActive}) => `nav-item ${isActive || (id === active && location.pathname.startsWith('/shipments/')) ? 'active' : ''}`}><span className="nav-icon">{icon}</span><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-footer"><div className="mini-card"><span className="dot green"/><div><b>ColdGuard services</b><small>Check service health endpoints</small></div></div><button className="logout" onClick={onLogout}>↪ Sign out</button></div>
    </aside>
    {open && <div className="mobile-overlay" onClick={() => setOpen(false)}/>}
    <aside className={`mobile-drawer ${open ? 'open' : ''}`}><div className="drawer-head"><b>ColdGuard</b><button onClick={() => setOpen(false)}>×</button></div>{nav.filter(([id]) => (roleAccess[user.role] || roleAccess.viewer).includes(id)).map(([id,label,icon]) => <NavLink key={id} onClick={() => setOpen(false)} to={'/'+id} className="nav-item"><span className="nav-icon">{icon}</span>{label}</NavLink>)}</aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu" onClick={() => setOpen(true)}>☰</button><div><div className="crumb">Operations / <b>{nav.find(x => x[0] === active)?.[1] || 'Dashboard'}</b></div><div className="top-title">Clinical Cold Chain Control Tower</div></div><div className="top-actions"><div className="system-status"><span className="dot green"/> Session Active</div><div className="user-chip"><span>{(user.name || 'User').slice(0,1).toUpperCase()}</span><div><b>{user.name}</b><small>{user.role}</small></div></div></div></header>
      <section className="content">{children}</section>
    </main>
    {toast && <div className="toast">✓ {toast}</div>}
  </div>;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const submit = async e => { e.preventDefault(); setLoading(true); setError(''); try { await onLogin(email,password); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  return <div className="login-page"><div className="login-panel"><div className="brand large"><div className="brand-mark">C</div><div><strong>ColdGuard</strong><span>Cold Chain Intelligence</span></div></div><div className="login-copy"><p className="eyebrow">SECURE OPERATIONS PORTAL</p><h1>Protect every shipment.<br/><em>Every degree matters.</em></h1><p>Real-time temperature monitoring, AI anomaly detection and compliance records in one control tower.</p></div><div className="login-highlights"><span>✓ Live telemetry</span><span>✓ AI risk scoring</span><span>✓ Audit-ready history</span></div></div><form className="login-card" onSubmit={submit}><p className="eyebrow">SIGN IN</p><h2>Welcome back</h2><p className="muted">Use your ColdGuard operations account.</p>{error && <div className="error-box">{error}</div>}<label>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="username" required/></label><label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" required/></label><button className="primary full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in securely →'}</button><div className="demo-hint">Development demo accounts are created on first backend start.<br/><b>admin@coldchain.local</b><br/>Password is configured with `DEMO_PASSWORD` in backend/.env.</div></form></div>;
}

function PageHeader({eyebrow,title,description,actions}) { return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="muted">{description}</p>}</div><div className="actions">{actions}</div></div>; }
function Stat({label,value,sub,tone='blue'}) { return <div className="stat"><div className={`stat-icon ${tone}`}>{tone==='red'?'!':tone==='green'?'✓':tone==='purple'?'⌁':'◈'}</div><div><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div></div>; }
function Badge({status}) { const map={NORMAL:'green',WARNING:'amber',CRITICAL:'red',IN_TRANSIT:'blue',AT_RISK:'red',DELIVERED:'green',PLANNED:'slate',RESOLVED:'slate',AVAILABLE:'green',ON_ROUTE:'blue',ACTIVE:'green',INACTIVE:'slate',MAINTENANCE:'amber'}; return <span className={`badge ${map[status]||'slate'}`}><i/> {String(status||'UNKNOWN').replaceAll('_',' ')}</span>; }
function Loading(){return <div className="loading">Loading operational data…</div>}
function ErrorState({message}){return <div className="empty error-state">{message || 'Unable to load data. Check the backend service.'}</div>}

function Dashboard({refresh}) {
  const [data,setData]=useState(null), [shipments,setShipments]=useState([]), [alerts,setAlerts]=useState([]), [readings,setReadings]=useState([]), [error,setError]=useState('');
  useEffect(()=>{Promise.all([dashboardApi(),shipmentsApi(),alertsApi(),readingsApi({limit:30})]).then(([d,s,a,r])=>{setData(d.data);setShipments(s.data);setAlerts(a.data);setReadings(r.data);setError('')}).catch(e=>setError(e.response?.data?.message||e.message))},[refresh]);
  if(error) return <><PageHeader eyebrow="CONTROL TOWER" title="Operations Dashboard" description="Live cold-chain performance across shipments, vehicles and telemetry."/><ErrorState message={error}/></>;
  if(!data) return <Loading/>;
  const chart=[...readings].reverse().map(x=>({time:new Date(x.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), temp:x.temperature}));
  return <><PageHeader eyebrow="CONTROL TOWER" title="Operations Dashboard" description="Live cold-chain performance across shipments, vehicles and telemetry." actions={<span className="live-label"><span className="dot green"/> LIVE</span>}/><div className="stats-grid"><Stat label="ACTIVE SHIPMENTS" value={data.activeShipments} sub="Tracked now"/><Stat label="ACTIVE ALERTS" value={data.activeAlerts} sub="Require attention" tone="red"/><Stat label="FLEET VEHICLES" value={data.vehicles} sub="Registered units" tone="green"/><Stat label="LATEST TEMPERATURE" value={data.currentTemperature == null ? '—' : `${data.currentTemperature.toFixed(1)}°C`} sub={data.currentStatus} tone={data.currentStatus==='CRITICAL'?'red':'green'}/></div><div className="two-col"><div className="card"><div className="card-head"><div><h3>Temperature telemetry</h3><p>Latest 30 sensor readings</p></div><Badge status={data.currentStatus}/></div>{chart.length ? <div className="chart"><ResponsiveContainer width="100%" height={260}><LineChart data={chart}><XAxis dataKey="time" tick={{fontSize:11}}/><YAxis domain={['auto','auto']} tick={{fontSize:11}}/><Tooltip/><Line type="monotone" dataKey="temp" stroke="#006194" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div> : <div className="empty">Waiting for sensor readings…</div>}</div><div className="card"><div className="card-head"><div><h3>Recent incidents</h3><p>AI and threshold alerts</p></div><a href="/alerts">View all</a></div>{alerts.slice(0,5).map(a=><div className="list-row" key={a._id}><div><b>{a.shipmentId}</b><p>{a.message}</p></div><Badge status={a.resolved?'RESOLVED':a.severity}/></div>)}{!alerts.length&&<div className="empty">No incidents recorded.</div>}</div></div><div className="card"><div className="card-head"><div><h3>Shipment operations</h3><p>Real records from MongoDB</p></div><a href="/shipments">Open operations</a></div><Table shipments={shipments.slice(0,6)} /></div></>;
}

function Table({shipments}) { return <div className="table-wrap"><table><thead><tr><th>Shipment</th><th>Product</th><th>Route</th><th>Vehicle</th><th>Status</th></tr></thead><tbody>{shipments.map(s=><tr key={s._id||s.shipmentId}><td><a href={`/shipments/${s.shipmentId}`}>{s.shipmentId}</a></td><td>{s.productName}</td><td>{s.source} → {s.destination}</td><td>{s.vehicleId || '—'}</td><td><Badge status={s.status}/></td></tr>)}</tbody></table>{!shipments.length&&<div className="empty">No shipments found.</div>}</div> }

function Monitoring({refresh,toast}) { const [readings,setReadings]=useState([]),[shipments,setShipments]=useState([]),[selected,setSelected]=useState('SH001'),[error,setError]=useState(''); useEffect(()=>{Promise.all([readingsApi({shipmentId:selected,limit:60}),shipmentsApi()]).then(([r,s])=>{setReadings(r.data);setShipments(s.data)}).catch(e=>setError(e.message))},[refresh,selected]); const latest=readings[0]; const chart=[...readings].reverse().map(x=>({time:new Date(x.timestamp).toLocaleTimeString(),temp:x.temperature,humidity:x.humidity})); return <><PageHeader eyebrow="TELEMETRY STREAM" title="Live Fleet Monitoring" description="Actual sensor readings ingested by the Node/Express API and analyzed by the Python service." actions={<div className="live-label"><span className="dot green pulse"/> STREAMING</div>}/><div className="toolbar"><select value={selected} onChange={e=>setSelected(e.target.value)}>{shipments.map(s=><option key={s.shipmentId} value={s.shipmentId}>{s.shipmentId} · {s.productName}</option>)}</select><button className="secondary" onClick={()=>toast('Monitoring view refreshed from API.')}>↻ Refresh</button></div>{error?<ErrorState message={error}/>:<><div className="stats-grid"><Stat label="CORE TEMPERATURE" value={latest?`${latest.temperature.toFixed(1)}°C`:'—'} sub={latest?.status||'NO DATA'} tone={latest?.status==='CRITICAL'?'red':'green'}/><Stat label="HUMIDITY" value={latest?`${latest.humidity.toFixed(1)}%`:'—'} sub="Relative humidity" tone="blue"/><Stat label="AI RISK SCORE" value={latest?`${Math.round((latest.riskScore||0)*100)}%`:'—'} sub={latest?.anomalyReason||'No anomaly detected'} tone={latest?.anomaly?'red':'purple'}/><Stat label="PACKETS" value={readings.length} sub="Latest window" tone="green"/></div><div className="two-col"><div className="card"><div className="card-head"><div><h3>Temperature trend</h3><p>Shipment {selected} · target 2°C–8°C</p></div>{latest&&<Badge status={latest.status}/>}</div>{chart.length?<div className="chart"><ResponsiveContainer width="100%" height={320}><LineChart data={chart}><XAxis dataKey="time" tick={{fontSize:10}}/><YAxis domain={[0,12]} tick={{fontSize:11}}/><Tooltip/><Line type="monotone" dataKey="temp" stroke="#006194" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div>:<div className="empty">Waiting for simulator data…</div>}</div><div className="card"><div className="card-head"><div><h3>Latest sensor packets</h3><p>Timestamped audit trail</p></div></div>{readings.slice(0,8).map(r=><div className="list-row" key={r._id}><div><b>{new Date(r.timestamp).toLocaleString()}</b><p>{r.latitude?.toFixed?.(4) ?? '—'}, {r.longitude?.toFixed?.(4) ?? '—'} · AI {Math.round((r.riskScore||0)*100)}%</p></div><div className="row-right"><strong>{r.temperature.toFixed(1)}°C</strong><Badge status={r.status}/></div></div>)}</div></div></>}</> }

function Shipments({toast,user}) { const [items,setItems]=useState([]),[show,setShow]=useState(false),[form,setForm]=useState({shipmentId:'',productName:'',source:'',destination:'',vehicleId:'',temperatureMin:2,temperatureMax:8}),[query,setQuery]=useState(''),[error,setError]=useState(''); const load=()=>shipmentsApi().then(r=>setItems(r.data)).catch(e=>setError(e.message)); useEffect(()=>{load();},[]); const filtered=items.filter(s=>`${s.shipmentId} ${s.productName} ${s.source} ${s.destination}`.toLowerCase().includes(query.toLowerCase())); const create=async e=>{e.preventDefault();try{await createShipmentApi({...form,temperatureMin:Number(form.temperatureMin),temperatureMax:Number(form.temperatureMax),status:'PLANNED'});setShow(false);setForm({shipmentId:'',productName:'',source:'',destination:'',vehicleId:'',temperatureMin:2,temperatureMax:8});toast('Shipment created successfully.');load()}catch(err){toast(err.response?.data?.message||'Unable to create shipment.')}}; return <><PageHeader eyebrow="FLEET OPERATIONS" title="Shipment Operations" description="Create, monitor and inspect every temperature-sensitive shipment." actions={user && ['admin','manager'].includes(user.role) ? <button className="primary" onClick={()=>setShow(true)}>＋ Create Shipment</button> : null}/><div className="stats-grid"><Stat label="TOTAL" value={items.length}/><Stat label="IN TRANSIT" value={items.filter(x=>x.status==='IN_TRANSIT').length} tone="green"/><Stat label="AT RISK" value={items.filter(x=>x.status==='AT_RISK').length} tone="red"/><Stat label="DELIVERED" value={items.filter(x=>x.status==='DELIVERED').length} tone="purple"/></div><div className="card"><div className="toolbar"><input className="search" placeholder="Search shipment, product or route…" value={query} onChange={e=>setQuery(e.target.value)}/></div>{error?<ErrorState message={error}/>:<Table shipments={filtered}/>}</div>{show&&<Modal title="Create shipment" onClose={()=>setShow(false)}><form onSubmit={create} className="form-grid">{[['shipmentId','Shipment ID'],['productName','Product name'],['source','Origin'],['destination','Destination'],['vehicleId','Vehicle ID']].map(([k,l])=><label key={k}>{l}<input required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<label>Min °C<input type="number" value={form.temperatureMin} onChange={e=>setForm({...form,temperatureMin:e.target.value})}/></label><label>Max °C<input type="number" value={form.temperatureMax} onChange={e=>setForm({...form,temperatureMax:e.target.value})}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShow(false)}>Cancel</button><button className="primary">Create</button></div></form></Modal>}</> }

function ShipmentDetail({toast}) { const {id}=useParams(); const [shipment,setShipment]=useState(null),[readings,setReadings]=useState([]),[alerts,setAlerts]=useState([]),[error,setError]=useState(''); useEffect(()=>{Promise.all([shipmentApi(id),readingsApi({shipmentId:id,limit:200}),alertsApi()]).then(([s,r,a])=>{setShipment(s.data);setReadings(r.data.filter(x=>x.shipmentId===id));setAlerts(a.data.filter(x=>x.shipmentId===id))}).catch(e=>setError(e.response?.data?.message||e.message))},[id]); if(error)return <ErrorState message={error}/>; if(!shipment)return <Loading/>; const latest=readings[0]; const chart=[...readings].reverse().map(r=>({time:new Date(r.timestamp).toLocaleTimeString(),temp:r.temperature})); return <><PageHeader eyebrow="SHIPMENT DETAIL" title={shipment.shipmentId} description={`${shipment.productName} · ${shipment.source} → ${shipment.destination}`} actions={<Badge status={shipment.status}/>} /><div className="stats-grid"><Stat label="CURRENT TEMP" value={latest?`${latest.temperature.toFixed(1)}°C`:'—'} sub={`Spec ${shipment.temperatureMin}–${shipment.temperatureMax}°C`} tone={latest?.status==='CRITICAL'?'red':'green'}/><Stat label="AI RISK" value={latest?`${Math.round((latest.riskScore||0)*100)}%`:'—'} sub={latest?.anomaly?'Anomaly detected':'Normal pattern'} tone={latest?.anomaly?'red':'purple'}/><Stat label="READINGS" value={readings.length} sub="Stored packets"/><Stat label="INCIDENTS" value={alerts.length} sub="Shipment history" tone={alerts.length?'red':'green'}/></div><div className="two-col"><div className="card"><div className="card-head"><div><h3>Temperature history</h3><p>Sensor readings from MongoDB</p></div></div>{chart.length?<div className="chart"><ResponsiveContainer width="100%" height={320}><LineChart data={chart}><XAxis dataKey="time"/><YAxis domain={[0,12]}/><Tooltip/><Line type="monotone" dataKey="temp" stroke="#006194" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div>:<div className="empty">No readings yet.</div>}</div><div className="card"><div className="card-head"><div><h3>Incident history</h3><p>Threshold + AI events</p></div></div>{alerts.map(a=><div className="list-row" key={a._id}><div><b>{a.type}</b><p>{a.message}</p><small>{new Date(a.timestamp).toLocaleString()}</small></div><Badge status={a.resolved?'RESOLVED':a.severity}/></div>)}{!alerts.length&&<div className="empty">No incidents for this shipment.</div>}</div></div></> }

function Alerts({toast,user}) { const [items,setItems]=useState([]),[query,setQuery]=useState(''),[filter,setFilter]=useState('ALL'); const load=()=>alertsApi().then(r=>setItems(r.data)); useEffect(()=>{load();},[]); const resolve=async id=>{try{await resolveAlertApi(id);toast('Alert resolved and audit state updated.');load()}catch(e){toast(e.response?.data?.message||'Unable to resolve alert.')}}; const filtered=items.filter(a=>(filter==='ALL'||(filter==='RESOLVED'?a.resolved:a.severity===filter&&!a.resolved))&&`${a.shipmentId} ${a.message} ${a.type}`.toLowerCase().includes(query.toLowerCase())); return <><PageHeader eyebrow="RISK & INCIDENTS" title="Alerts & Incidents" description="Threshold alerts and AI anomaly events requiring operational attention."/><div className="stats-grid"><Stat label="CRITICAL" value={items.filter(a=>a.severity==='CRITICAL'&&!a.resolved).length} tone="red"/><Stat label="WARNING" value={items.filter(a=>a.severity==='WARNING'&&!a.resolved).length} tone="blue"/><Stat label="RESOLVED" value={items.filter(a=>a.resolved).length} tone="green"/><Stat label="TOTAL EVENTS" value={items.length} tone="purple"/></div><div className="card"><div className="toolbar"><input className="search" placeholder="Search incidents…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="filters">{['ALL','CRITICAL','WARNING','RESOLVED'].map(x=><button key={x} onClick={()=>setFilter(x)} className={filter===x?'filter active':'filter'}>{x}</button>)}</div></div>{filtered.map(a=><div className="incident" key={a._id}><div className={`incident-mark ${a.severity==='CRITICAL'?'red':'amber'}`}>!</div><div className="incident-main"><div className="incident-title"><b>{a.type.replaceAll('_',' ')}</b><Badge status={a.resolved?'RESOLVED':a.severity}/></div><p>{a.message}</p><small>{a.shipmentId} · {new Date(a.timestamp).toLocaleString()} {a.temperature != null && `· ${a.temperature}°C`}</small></div>{!a.resolved&&user&&['admin','manager','operator'].includes(user.role)&&<button className="secondary" onClick={()=>resolve(a._id)}>Resolve</button>}</div>)}{!filtered.length&&<div className="empty">No matching incidents.</div>}</div></> }

function Vehicles({toast,user}) { const [items,setItems]=useState([]),[show,setShow]=useState(false),[form,setForm]=useState({vehicleId:'',vehicleNumber:'',driverName:'',shipmentId:'',status:'AVAILABLE'}); const load=()=>vehiclesApi().then(r=>setItems(r.data)).catch(e=>toast(e.response?.data?.message||e.message)); useEffect(()=>{load();},[]); const create=async e=>{e.preventDefault();try{await createVehicleApi(form);toast('Vehicle created.');setShow(false);load()}catch(err){toast(err.response?.data?.message||'Unable to create vehicle.')}}; return <><PageHeader eyebrow="FLEET" title="Reefer Fleet Management" description="Vehicles and telemetry assignments sourced from the backend." actions={user && ['admin','manager'].includes(user.role) ? <button className="primary" onClick={()=>setShow(true)}>＋ Add Vehicle</button> : null}/><div className="vehicle-grid">{items.map(v=><div className="card vehicle" key={v._id}><div className="card-head"><div><span className="mono">{v.vehicleId}</span><h3>{v.vehicleNumber||'Vehicle'}</h3></div><Badge status={v.status}/></div><p><b>Driver:</b> {v.driverName||'—'}</p><p><b>Shipment:</b> {v.shipmentId||'—'}</p><p><b>Location:</b> {v.currentLocation?.latitude?.toFixed?.(4) ?? '—'}, {v.currentLocation?.longitude?.toFixed?.(4) ?? '—'}</p><div className="vehicle-temp">{v.temperature == null ? '—' : `${v.temperature.toFixed(1)}°C`}</div></div>)}{!items.length&&<div className="empty">No vehicles registered yet.</div>}</div>{show&&<Modal title="Add vehicle" onClose={()=>setShow(false)}><form onSubmit={create} className="form-grid">{[['vehicleId','Vehicle ID'],['vehicleNumber','Vehicle number'],['driverName','Driver name'],['shipmentId','Shipment ID']].map(([k,l])=><label key={k}>{l}<input required={k==='vehicleId'} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>AVAILABLE</option><option>ON_ROUTE</option><option>MAINTENANCE</option></select></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShow(false)}>Cancel</button><button className="primary">Create</button></div></form></Modal>}</> }

function Warehouses({user,refresh}) {
  const emptyForm={name:'',location:'',capacity:'',capacityUnit:'pallets',status:'ACTIVE',shipmentIds:[]};
  const [items,setItems]=useState([]),[shipments,setShipments]=useState([]),[loading,setLoading]=useState(true);
  const [show,setShow]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(emptyForm);
  const [query,setQuery]=useState(''),[statusFilter,setStatusFilter]=useState('ALL');
  const [error,setError]=useState(''),[shipmentError,setShipmentError]=useState(''),[formError,setFormError]=useState(''),[saving,setSaving]=useState(false);
  const canManage=['admin','manager'].includes(user?.role);
  const load=async()=>{
    setLoading(true);
    try { const response=await warehousesApi(); setItems(response.data); setError(''); }
    catch(err) { setError(err.response?.data?.message||'Unable to load cold storage hubs.'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{load();},[refresh]);
  useEffect(()=>{
    shipmentsApi().then(response=>{setShipments(response.data);setShipmentError('');})
      .catch(err=>setShipmentError(err.response?.data?.message||'Unable to load shipment assignments.'));
  },[]);
  const filtered=items.filter(item=>{
    const matchesQuery=`${item.name} ${item.location} ${(item.shipmentIds||[]).join(' ')}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery&&(statusFilter==='ALL'||item.status===statusFilter);
  });
  const openCreate=()=>{setEditing(null);setForm(emptyForm);setFormError('');setShow(true);};
  const openEdit=item=>{setEditing(item);setForm({name:item.name,location:item.location,capacity:String(item.capacity),capacityUnit:item.capacityUnit||'pallets',status:item.status||'ACTIVE',shipmentIds:item.shipmentIds||[]});setFormError('');setShow(true);};
  const closeForm=()=>{if(!saving){setShow(false);setFormError('');}};
  const save=async event=>{
    event.preventDefault();setSaving(true);setFormError('');
    const payload={...form,capacity:Number(form.capacity)};
    try {
      if(editing) await updateWarehouseApi(editing._id,payload);
      else await createWarehouseApi(payload);
      setShow(false);setForm(emptyForm);setEditing(null);await load();
    } catch(err) { setFormError(err.response?.data?.message||'Unable to save this warehouse.'); }
    finally { setSaving(false); }
  };
  const remove=async item=>{
    if(!window.confirm(`Delete "${item.name}"? This removes only the warehouse record; shipments and sensor history are preserved.`)) return;
    setError('');
    try { await deleteWarehouseApi(item._id);await load(); }
    catch(err) { setError(err.response?.data?.message||'Unable to delete this warehouse.'); }
  };
  const toggleShipment=id=>setForm(current=>({...current,shipmentIds:current.shipmentIds.includes(id)?current.shipmentIds.filter(value=>value!==id):[...current.shipmentIds,id]}));
  return <>
    <PageHeader eyebrow="STORAGE NETWORK" title="Cold Storage Hubs" description="Manage storage locations and view telemetry only when linked sensor records are available." actions={canManage?<button className="primary" onClick={openCreate}>＋ Add storage hub</button>:null}/>
    <div className="stats-grid">
      <Stat label="TOTAL HUBS" value={items.length}/>
      <Stat label="ACTIVE" value={items.filter(item=>item.status==='ACTIVE').length} tone="green"/>
      <Stat label="MAINTENANCE" value={items.filter(item=>item.status==='MAINTENANCE').length} tone="blue"/>
      <Stat label="LINKED ALERTS" value={items.reduce((total,item)=>total+(item.activeAlerts?.length||0),0)} tone="red"/>
    </div>
    <div className="card">
      <div className="toolbar">
        <input className="search" aria-label="Search storage hubs" placeholder="Search hub, location or shipment…" value={query} onChange={event=>setQuery(event.target.value)}/>
        <select aria-label="Filter by warehouse status" value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}>
          <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="MAINTENANCE">Maintenance</option><option value="INACTIVE">Inactive</option>
        </select>
      </div>
      {error&&<div className="empty error-state" role="alert">{error}<button className="secondary retry-button" onClick={load}>Retry</button></div>}
      {loading?<Loading/>:!error&&!filtered.length?<div className="empty">{items.length?'No hubs match your search or status filter.':'No cold storage hubs have been added yet.'}</div>:!error&&<div className="warehouse-grid">
        {filtered.map(item=><article className="card warehouse-card" key={item._id}>
          <div className="card-head"><div><p className="eyebrow">COLD STORAGE HUB</p><h3>{item.name}</h3></div><Badge status={item.status}/></div>
          <p className="warehouse-location">⌖ {item.location}</p>
          <div className="warehouse-capacity"><span>STORAGE CAPACITY</span><strong>{item.capacity} {item.capacityUnit||'pallets'}</strong></div>
          <div className="warehouse-telemetry">
            <div><span>Temperature</span><strong>{item.telemetry?`${Number(item.telemetry.temperature).toFixed(1)}°C`:'—'}</strong></div>
            <div><span>Humidity</span><strong>{item.telemetry?`${Number(item.telemetry.humidity).toFixed(1)}%`:'—'}</strong></div>
          </div>
          {item.telemetry?<p className="warehouse-reading">Latest linked reading · {new Date(item.telemetry.timestamp).toLocaleString()} <Badge status={item.telemetry.status}/></p>:<p className="warehouse-reading muted">No linked sensor readings available</p>}
          <div className="warehouse-links"><span>Linked shipments</span><strong>{item.shipmentIds?.length?item.shipmentIds.join(', '):'None'}</strong></div>
          <div className="warehouse-links"><span>Unresolved alerts</span><strong>{item.activeAlerts?.length||0}</strong></div>
          {item.activeAlerts?.length>0&&<div className="warehouse-alerts">{item.activeAlerts.slice(0,3).map(alert=><p key={alert._id}>{alert.severity} · {alert.message}</p>)}{item.activeAlerts.length>3&&<p>+{item.activeAlerts.length-3} more</p>}</div>}
          {canManage&&<div className="warehouse-actions"><button className="secondary" onClick={()=>openEdit(item)}>Edit</button><button className="secondary danger-button" onClick={()=>remove(item)}>Delete</button></div>}
        </article>)}
      </div>}
    </div>
    {shipmentError&&<p className="error-box warehouse-form-note" role="alert">{shipmentError}</p>}
    {show&&<Modal title={editing?'Edit storage hub':'Add storage hub'} onClose={closeForm}>
      <form onSubmit={save} className="form-grid">
        <label>Warehouse name<input required maxLength="100" value={form.name} onChange={event=>setForm({...form,name:event.target.value})}/></label>
        <label>Location<input required maxLength="200" value={form.location} onChange={event=>setForm({...form,location:event.target.value})}/></label>
        <label>Storage capacity<input type="number" required min="0.01" step="any" value={form.capacity} onChange={event=>setForm({...form,capacity:event.target.value})}/></label>
        <label>Capacity unit<input required maxLength="20" value={form.capacityUnit} onChange={event=>setForm({...form,capacityUnit:event.target.value})}/></label>
        <label>Status<select value={form.status} onChange={event=>setForm({...form,status:event.target.value})}><option value="ACTIVE">Active</option><option value="MAINTENANCE">Maintenance</option><option value="INACTIVE">Inactive</option></select></label>
        <fieldset className="warehouse-shipment-select"><legend>Linked shipments for telemetry and alerts</legend>
          {shipments.length?shipments.map(shipment=><label key={shipment.shipmentId}><input type="checkbox" checked={form.shipmentIds.includes(shipment.shipmentId)} onChange={()=>toggleShipment(shipment.shipmentId)}/><span>{shipment.shipmentId} · {shipment.productName}</span></label>):<p className="muted">No shipments are available to link.</p>}
        </fieldset>
        {formError&&<div className="error-box form-error" role="alert">{formError}</div>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={closeForm} disabled={saving}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving…':editing?'Save changes':'Create hub'}</button></div>
      </form>
    </Modal>}
  </>;
}

function Compliance({refresh}){ const [shipments,setShipments]=useState([]),[alerts,setAlerts]=useState([]),[readings,setReadings]=useState([]); useEffect(()=>{Promise.all([shipmentsApi(),alertsApi(),readingsApi({limit:500})]).then(([s,a,r])=>{setShipments(s.data);setAlerts(a.data);setReadings(r.data)})},[refresh]); const excursions=readings.filter(r=>r.status!=='NORMAL').length; const resolved=alerts.filter(a=>a.resolved).length; const exportReport=()=>{const rows=[['Shipment ID','Timestamp','Temperature C','Humidity %','Status','AI Anomaly','Risk Score','Anomaly Reason'],...readings.map(r=>[r.shipmentId,r.timestamp,r.temperature,r.humidity,r.status,r.anomaly,r.riskScore,r.anomalyReason])];const csv=rows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='coldguard-compliance-readings.csv';a.click();URL.revokeObjectURL(url)}; return <><PageHeader eyebrow="QUALITY & AUDIT" title="Compliance Control" description="Evidence and monitoring history to support cold-chain regulatory review." actions={<button className="secondary" onClick={exportReport}>Export readings CSV</button>}/><div className="stats-grid"><Stat label="SHIPMENTS" value={shipments.length}/><Stat label="TELEMETRY RECORDS" value={readings.length} tone="blue"/><Stat label="EXCURSIONS" value={excursions} tone={excursions?'red':'green'}/><Stat label="RESOLVED ALERTS" value={resolved} tone="green"/></div><div className="two-col"><div className="card"><h3>Audit evidence</h3><div className="checklist"><div>✓ Timestamped sensor readings</div><div>✓ Shipment and route history</div><div>✓ Temperature threshold status</div><div>✓ AI anomaly and risk score</div><div>✓ Alert resolution timestamps</div><div>✓ Authenticated user access</div></div></div><div className="card"><h3>Compliance statement</h3><p className="muted">ColdGuard supports monitoring, evidence collection and audit workflows. It does not by itself certify legal or regulatory compliance.</p><div className="notice"><b>Operational rule</b><p>Temperature-sensitive shipments are evaluated against their configured minimum and maximum temperature range, while the AI service provides an additional anomaly signal.</p></div></div></div></> }

function Analytics({refresh}){ const [readings,setReadings]=useState([]),[alerts,setAlerts]=useState([]); useEffect(()=>{Promise.all([readingsApi({limit:500}),alertsApi()]).then(([r,a])=>{setReadings(r.data);setAlerts(a.data)})},[refresh]); const normal=readings.filter(r=>r.status==='NORMAL').length, warning=readings.filter(r=>r.status==='WARNING').length, critical=readings.filter(r=>r.status==='CRITICAL').length; const chart=[...readings].reverse().map(r=>({time:new Date(r.timestamp).toLocaleTimeString(),temp:r.temperature})); return <><PageHeader eyebrow="PERFORMANCE" title="Cold Chain Analytics" description="Operational analytics computed from MongoDB telemetry and alert records."/><div className="stats-grid"><Stat label="NORMAL PACKETS" value={normal} tone="green"/><Stat label="WARNING PACKETS" value={warning} tone="blue"/><Stat label="CRITICAL PACKETS" value={critical} tone="red"/><Stat label="AI ANOMALIES" value={readings.filter(r=>r.anomaly).length} tone="purple"/></div><div className="two-col"><div className="card"><div className="card-head"><div><h3>Telemetry performance</h3><p>Recent temperature sequence</p></div></div><div className="chart"><ResponsiveContainer width="100%" height={330}><LineChart data={chart}><XAxis dataKey="time"/><YAxis/><Tooltip/><Line type="monotone" dataKey="temp" stroke="#006194" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div></div><div className="card"><div className="card-head"><div><h3>Event mix</h3><p>{alerts.length} alert records</p></div></div><div className="bar-stat"><span>Normal</span><div><i style={{width:`${readings.length?normal/readings.length*100:0}%`}}/></div><b>{normal}</b></div><div className="bar-stat"><span>Warning</span><div><i style={{width:`${readings.length?warning/readings.length*100:0}%`}}/></div><b>{warning}</b></div><div className="bar-stat"><span>Critical</span><div><i style={{width:`${readings.length?critical/readings.length*100:0}%`}}/></div><b>{critical}</b></div></div></div></> }

function Settings({user}){ return <><PageHeader eyebrow="SYSTEM" title="Settings" description="Runtime configuration and account information."/><div className="two-col"><div className="card"><h3>Account</h3><div className="settings-row"><span>Name</span><b>{user.name}</b></div><div className="settings-row"><span>Email</span><b>{user.email}</b></div><div className="settings-row"><span>Role</span><Badge status={user.role.toUpperCase()}/></div></div><div className="card"><h3>Cold-chain defaults</h3><div className="settings-row"><span>Standard temperature</span><b>2°C – 8°C</b></div><div className="settings-row"><span>AI service</span><b>Python anomaly detection</b></div><div className="settings-row"><span>Data store</span><b>MongoDB</b></div><div className="settings-row"><span>API</span><b>Node.js + Express</b></div></div></div></> }

function UserAdministration({toast}) {
  const [users,setUsers]=useState([]), [logs,setLogs]=useState([]), [show,setShow]=useState(false), [error,setError]=useState('');
  const [form,setForm]=useState({name:'',email:'',password:'',role:'viewer'});
  const load=async()=>{try{const [u,l]=await Promise.all([adminUsersApi(),auditLogsApi({limit:100})]);setUsers(u.data);setLogs(l.data);setError('')}catch(e){setError(e.response?.data?.message||'Unable to load admin data')}};
  useEffect(()=>{load()},[]);
  const create=async e=>{e.preventDefault();try{await createAdminUserApi(form);setForm({name:'',email:'',password:'',role:'viewer'});setShow(false);toast('User account created.');load()}catch(e){toast(e.response?.data?.message||'Could not create user')}};
  const update=async (u,payload)=>{try{await updateAdminUserApi(u.id,payload);toast('User permissions updated.');load()}catch(e){toast(e.response?.data?.message||'Could not update user')}};
  const reset=async u=>{const password=window.prompt(`Set a new password for ${u.email} (minimum 10 characters):`);if(password===null)return;try{await resetAdminPasswordApi(u.id,password);toast('Password reset successfully.')}catch(e){toast(e.response?.data?.message||'Password reset failed')}};
  const exportLogs=()=>{const rows=[['Timestamp','Action','Entity','Entity ID','User','Details'],...logs.map(x=>[x.timestamp,x.action,x.entity,x.entityId,x.userEmail,JSON.stringify(x.details||{})])];const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='coldguard-audit-logs.csv';a.click();URL.revokeObjectURL(url)};
  return <><PageHeader eyebrow="ADMINISTRATION" title="User & Access Management" description="Create accounts, assign roles, disable access and review security audit events." actions={<button className="primary" onClick={()=>setShow(true)}>＋ Create user</button>}/>{error&&<ErrorState message={error}/>}<div className="card"><div className="card-head"><div><h3>Registered users</h3><p>Roles are enforced by the backend API.</p></div></div><div className="table-wrap"><table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td><select value={u.role} onChange={e=>update(u,{role:e.target.value})}>{['admin','manager','operator','viewer'].map(r=><option key={r} value={r}>{r}</option>)}</select></td><td><Badge status={u.active?'ACTIVE':'DISABLED'}/></td><td><div className="actions"><button className="secondary" onClick={()=>update(u,{active:!u.active})}>{u.active?'Disable':'Enable'}</button><button className="secondary" onClick={()=>reset(u)}>Reset password</button></div></td></tr>)}</tbody></table>{!users.length&&<div className="empty">No users found.</div>}</div></div><div className="card"><div className="card-head"><div><h3>Security audit trail</h3><p>Latest {logs.length} recorded account and operational events.</p></div><button className="secondary" onClick={exportLogs}>Export CSV</button></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>User</th></tr></thead><tbody>{logs.map((l,i)=><tr key={l._id||i}><td>{new Date(l.timestamp).toLocaleString()}</td><td>{l.action}</td><td>{l.entity} {l.entityId||''}</td><td>{l.userEmail||'System'}</td></tr>)}</tbody></table>{!logs.length&&<div className="empty">No audit events yet.</div>}</div></div>{show&&<Modal title="Create user account" onClose={()=>setShow(false)}><form onSubmit={create} className="form-grid"><label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Temporary password (10+ characters)<input type="password" minLength={10} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{['viewer','operator','manager','admin'].map(r=><option key={r}>{r}</option>)}</select></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShow(false)}>Cancel</button><button className="primary">Create account</button></div></form></Modal>}</>;
}

function Modal({title,onClose,children}){return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>{title}</h3><button onClick={onClose}>×</button></div>{children}</div></div>}

export default App;
