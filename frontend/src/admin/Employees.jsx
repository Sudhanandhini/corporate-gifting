import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { IconSearch, IconPlus, IconDownload } from '../lib/icons.jsx';
import Pagination from './Pagination.jsx';

const empty = { employee_id: '', first_name: '', last_name: '', email: '' };

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');       // bound to the input, updates every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState(''); // what's actually queried
  const [modal, setModal] = useState(null); // null | {mode, data}
  const [exportOpen, setExportOpen] = useState(false);
  const [err, setErr] = useState('');

  // Waits for a pause in typing before updating the query, so each keystroke
  // doesn't fire its own request.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const load = () => api.employees(debouncedSearch, page)
    .then((r) => { setRows(r.rows); setTotal(r.total); setPageSize(r.pageSize); })
    .catch((e) => setErr(e.message));
  // Runs immediately once debouncedSearch/page actually change — pagination
  // clicks aren't subject to the typing debounce above.
  useEffect(() => { load(); }, [debouncedSearch, page]);

  const remove = async (id) => {
    if (!confirm('Delete this employee?')) return;
    await api.deleteEmployee(id);
    load();
  };

  return (
    <>
      <div className="main-head">
        <div><h1>Employees</h1><div className="sub">Manage employee records</div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => setExportOpen(true)}>
            <IconDownload width={16} height={16} /> Export
          </button>
          <button className="btn btn-navy" style={{ width: 'auto' }}
            onClick={() => { setErr(''); setModal({ mode: 'add', data: empty }); }}>
            <IconPlus width={16} height={16} /> Add Employee
          </button>
        </div>
      </div>

      <div className="card panel">
        <div className="search" style={{ marginBottom: 18 }}>
          <IconSearch width={18} height={18} />
          <input placeholder="Search employees by name, email or employee ID…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        <table className="tbl">
          <thead>
            <tr><th>Employee ID</th><th>First Name</th><th>Last Name</th><th>Email</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="oid">{r.employee_id || '—'}</td>
                <td style={{ fontWeight: 700 }}>{r.first_name}</td>
                <td>{r.last_name}</td>
                <td className="muted">{r.email}</td>
                <td>
                  <span className={`status ${r.order_status ? r.order_status.toLowerCase() : 'not-submitted'}`}>
                    {r.order_status || 'Not Submitted'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="link-navy" onClick={() => { setErr(''); setModal({ mode: 'edit', data: r }); }}>Edit</span>
                  <span className="muted"> · </span>
                  <span className="link-red" onClick={() => remove(r.id)}>Delete</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 28 }}>No employees found.</td></tr>
            )}
          </tbody>
        </table>

        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />

        <p className="note">Employee ID, First Name, Last Name and Email are all required.</p>
      </div>

      {modal && (
        <EmployeeModal
          mode={modal.mode} initial={modal.data} error={err} setError={setErr}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
      {exportOpen && <ExportModal search={search} onClose={() => setExportOpen(false)} />}
    </>
  );
}

function ExportModal({ search, onClose }) {
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    api.exportEmployees(search)
      .then(setDone)
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Export Employees to Excel</h3>
        {busy && (
          <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="spinner" /> Generating…
          </p>
        )}
        {err && <p className="error-text" style={{ marginTop: 12 }}>{err}</p>}
        {done && (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Your export has started generating in the background and will appear in the
              Reports section shortly.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Close</button>
              <Link className="btn btn-navy" style={{ flex: 1, textAlign: 'center' }} to="/admin/reports">
                View in Reports
              </Link>
            </div>
          </>
        )}
        {!busy && err && (
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeModal({ mode, initial, onClose, onSaved, error, setError }) {
  const [form, setForm] = useState({
    employee_id: initial.employee_id || '', first_name: initial.first_name || '', last_name: initial.last_name || '', email: initial.email || '',
  });
  const [busy, setBusy] = useState(false);
  const f = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));
  const fEmployeeId = (e) => {
    const v = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
    setForm((s) => ({ ...s, employee_id: v }));
  };

  const save = async () => {
    setError(''); setBusy(true);
    try {
      if (mode === 'add') await api.createEmployee(form);
      else await api.updateEmployee(initial.id, form);
      onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === 'add' ? 'Add Employee' : 'Edit Employee'}</h3>
        <div className="wf-stack">
          <div><label className="label">Employee ID</label><input className="field" value={form.employee_id} onChange={fEmployeeId} placeholder="Up to 10 letters/digits" maxLength={10} /></div>
          <div><label className="label">First Name</label><input className="field" value={form.first_name} onChange={f('first_name')} /></div>
          <div><label className="label">Last Name</label><input className="field" value={form.last_name} onChange={f('last_name')} /></div>
          <div><label className="label">Email</label><input className="field" value={form.email} onChange={f('email')} /></div>
        </div>
        {error && <p className="error-text" style={{ marginTop: 14 }}>{error}</p>}
        <div className="btn-row" style={{ marginTop: 20, display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" style={{ flex: 1 }} onClick={save} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
