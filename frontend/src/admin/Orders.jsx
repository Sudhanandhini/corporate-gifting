import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { IconSearch, IconFilter, IconCalendar, IconDownload } from '../lib/icons.jsx';

const STATUSES = ['Submitted', 'Processing', 'Completed', 'Cancelled'];
const shortDate = (s) => new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

export default function Orders() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [view, setView] = useState(null);   // order being viewed
  const [edit, setEdit] = useState(null);    // order being edited
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => api.orders({ search, status, dateFrom, dateTo }).then((r) => { setRows(r); setSelectedIds(new Set()); }).catch((e) => setErr(e.message));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [search, status, dateFrom, dateTo]);

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const toggleSelectAll = () => setSelectedIds(allSelected ? new Set() : new Set(rows.map((o) => o.id)));
  const toggleOne = (id) => setSelectedIds((cur) => {
    const next = new Set(cur);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const applyBulkStatus = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkBusy(true); setErr('');
    try {
      await Promise.all([...selectedIds].map((id) => api.updateOrder(id, bulkStatus)));
      setBulkStatus('');
      load();
    } catch (e) { setErr(e.message); } finally { setBulkBusy(false); }
  };

  return (
    <>
      <div className="main-head">
        <div><h1>Orders</h1><div className="sub">Search, filter and update gift orders</div></div>
        <button className="btn btn-navy" style={{ width: 'auto' }} onClick={() => setExportOpen(true)}>
          <IconDownload width={16} height={16} /> Export
        </button>
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
          <div className="select date-range">
            <IconCalendar width={16} height={16} />
            <input type="date" value={dateFrom} max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
            <span className="sep">–</span>
            <input type="date" value={dateTo} min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
            {(dateFrom || dateTo) && (
              <button type="button" className="date-range-clear" onClick={() => { setDateFrom(''); setDateTo(''); }}>×</button>
            )}
          </div>
        </div>

        {err && <p className="error-text">{err}</p>}

        {selectedIds.size > 0 && (
          <div className="bulk-bar">
            <span>{selectedIds.size} selected</span>
            <div className="select">
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                <option value="">Change status to…</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button className="btn btn-navy" style={{ width: 'auto' }} onClick={applyBulkStatus} disabled={!bulkStatus || bulkBusy}>
              {bulkBusy ? <span className="spinner" /> : 'Apply'}
            </button>
            <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => setSelectedIds(new Set())}>Clear</button>
          </div>
        )}

        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Select all orders" />
              </th>
              <th>Order ID</th><th>Employee</th><th>Gift</th><th>Order Date</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleOne(o.id)} aria-label={`Select order ${o.order_code}`} />
                </td>
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
              <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 28 }}>No orders match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {view && <ViewModal order={view} onClose={() => setView(null)} />}
      {edit && (
        <EditModal order={edit} onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load(); }} />
      )}
      {exportOpen && (
        <ExportModal search={search} status={status} dateFrom={dateFrom} dateTo={dateTo}
          onClose={() => setExportOpen(false)} />
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
          <Row k="Last Name" v={order.last_name || '—'} />
          <Row k="Gift" v={`${order.gift_name}${order.quantity > 1 ? ` ×${order.quantity}` : ''}`} />
          <Row k="Email" v={order.client_email || '—'} />
          <Row k="Phone" v={order.phone} />
          <Row k="Employee ID" v={order.employee_id || '—'} />
          <Row k="Entity" v={order.entity || '—'} />
          <Row k="Address" v={`${order.address}, ${order.city}, ${order.state} ${order.pincode}`} />
          <Row k="Status" v={order.status} />
        </div>
        <button className="btn btn-navy" style={{ marginTop: 20 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function ExportModal({ search, status, dateFrom, dateTo, onClose }) {
  const [from, setFrom] = useState(dateFrom);
  const [to, setTo] = useState(dateTo);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null); // the generated report, once exported

  const run = async () => {
    setErr(''); setBusy(true);
    try {
      const report = await api.exportOrders({ search, status, dateFrom: from, dateTo: to });
      setDone(report);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Export Orders to Excel</h3>
        {!done ? (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Choose a date range to export.
              {status && ` Status filter "${status}"`}{status && search && ' and'}
              {search && ` search "${search}"`}
              {(status || search) && ' will also apply.'}
            </p>
            <label className="label">From</label>
            <input className="field" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            <label className="label" style={{ marginTop: 14 }}>To</label>
            <input className="field" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            {err && <p className="error-text" style={{ marginTop: 12 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn btn-navy" style={{ flex: 1 }} onClick={run} disabled={busy}>
                {busy ? <span className="spinner" /> : 'Export'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Exported {done.row_count} order{done.row_count === 1 ? '' : 's'} to <b>{done.filename}</b>.
              It's saved in the Reports section.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Close</button>
              <Link className="btn btn-navy" style={{ flex: 1, textAlign: 'center' }} to="/admin/reports">
                View in Reports
              </Link>
            </div>
          </>
        )}
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
