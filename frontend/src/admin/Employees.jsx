import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { IconSearch, IconPlus } from '../lib/icons.jsx';

const empty = { first_name: '', last_name: '', email: '' };

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | {mode, data}
  const [err, setErr] = useState('');

  const load = () => api.employees(search).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [search]);

  const remove = async (id) => {
    if (!confirm('Delete this employee?')) return;
    await api.deleteEmployee(id);
    load();
  };

  return (
    <>
      <div className="main-head">
        <div><h1>Employees</h1><div className="sub">Manage employee records</div></div>
        <button className="btn btn-navy" style={{ width: 'auto' }}
          onClick={() => { setErr(''); setModal({ mode: 'add', data: empty }); }}>
          <IconPlus width={16} height={16} /> Add Employee
        </button>
      </div>

      <div className="card panel">
        <div className="search" style={{ marginBottom: 18 }}>
          <IconSearch width={18} height={18} />
          <input placeholder="Search employees by name or email…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        <table className="tbl">
          <thead>
            <tr><th>First Name</th><th>Last Name</th><th>Email</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 700 }}>{r.first_name}</td>
                <td>{r.last_name}</td>
                <td className="muted">{r.email}</td>
                <td style={{ textAlign: 'right' }}>
                  <span className="link-navy" onClick={() => { setErr(''); setModal({ mode: 'edit', data: r }); }}>Edit</span>
                  <span className="muted"> · </span>
                  <span className="link-red" onClick={() => remove(r.id)}>Delete</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 28 }}>No employees found.</td></tr>
            )}
          </tbody>
        </table>

        <p className="note">Only First Name, Last Name and Email are stored per employee.</p>
      </div>

      {modal && (
        <EmployeeModal
          mode={modal.mode} initial={modal.data} error={err} setError={setErr}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}

function EmployeeModal({ mode, initial, onClose, onSaved, error, setError }) {
  const [form, setForm] = useState({
    first_name: initial.first_name || '', last_name: initial.last_name || '', email: initial.email || '',
  });
  const [busy, setBusy] = useState(false);
  const f = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

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
