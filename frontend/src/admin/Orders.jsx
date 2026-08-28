import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { IconSearch, IconFilter, IconCalendar } from '../lib/icons.jsx';

const STATUSES = ['Submitted', 'Processing', 'Completed'];
const shortDate = (s) => new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

export default function Orders() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [view, setView] = useState(null);   // order being viewed
  const [edit, setEdit] = useState(null);    // order being edited
  const [err, setErr] = useState('');

  const load = () => api.orders({ search, status, date }).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [search, status, date]);

  return (
    <>
      <div className="main-head">
        <div><h1>Orders</h1><div className="sub">Search, filter and update gift orders</div></div>
      </div>

      <div className="card panel">
        <div className="toolbar">
          <div className="search">
            <IconSearch width={18} height={18} />
            <input placeholder="Search Orders" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="select">
            <IconFilter width={16} height={16} />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Filter by Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="select">
            <IconCalendar width={16} height={16} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', padding: '12px 4px' }} />
          </div>
        </div>

        {err && <p className="error-text">{err}</p>}

        <table className="tbl">
          <thead>
            <tr><th>Order ID</th><th>Employee</th><th>Gift</th><th>Order Date</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="oid">#{o.order_code}</td>
                <td>{o.recipient_name}</td>
                <td>{o.gift_name}</td>
                <td>{shortDate(o.created_at)}</td>
                <td><span className={`status ${o.status.toLowerCase()}`}>{o.status}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <span className="link-navy" onClick={() => setView(o)}>View</span>
                  <span className="muted"> · </span>
                  <span className="link-gold" onClick={() => { setErr(''); setEdit(o); }}>Edit</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 28 }}>No orders match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {view && <ViewModal order={view} onClose={() => setView(null)} />}
      {edit && (
        <EditModal order={edit} onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load(); }} />
      )}
    </>
  );
}

function Row({ k, v }) {
  return (<div className="r"><span className="k">{k}</span><span className="v">{v}</span></div>);
}

function ViewModal({ order, onClose }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Order #{order.order_code}</h3>
        <div className="review-list">
          <Row k="Recipient" v={order.recipient_name} />
          <Row k="Gift" v={`${order.gift_name}${order.quantity > 1 ? ` ×${order.quantity}` : ''}`} />
          <Row k="Phone" v={order.phone} />
          <Row k="Address" v={`${order.address}, ${order.city}, ${order.state} ${order.pincode}`} />
          <Row k="Message" v={order.gift_message || '—'} />
          <Row k="Status" v={order.status} />
        </div>
        <button className="btn btn-navy" style={{ marginTop: 20 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function EditModal({ order, onClose, onSaved }) {
  const [status, setStatus] = useState(order.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setBusy(true); setErr('');
    try { await api.updateOrder(order.id, status); onSaved(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Order #{order.order_code}</h3>
        <label className="label">Status</label>
        <div className="select" style={{ width: '100%', border: '1.5px solid var(--line-strong)' }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%' }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {err && <p className="error-text" style={{ marginTop: 12 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" style={{ flex: 1 }} onClick={save} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
