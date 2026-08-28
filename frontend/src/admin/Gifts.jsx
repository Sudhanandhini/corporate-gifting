import { useEffect, useState } from 'react';
import { api, assetUrl } from '../lib/api.js';
import { IconGift, IconPlus } from '../lib/icons.jsx';

const empty = { name: '', description: '', active: 1 };

export default function Gifts() {
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(null); // null | {mode, data}
  const [err, setErr] = useState('');

  const load = () => api.adminGifts().then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Delete this gift?')) return;
    await api.deleteGift(id);
    load();
  };

  return (
    <>
      <div className="main-head">
        <div><h1>Gifts</h1><div className="sub">Manage the gift catalogue</div></div>
        <button className="btn btn-navy" style={{ width: 'auto' }}
          onClick={() => { setErr(''); setModal({ mode: 'add', data: empty }); }}>
          <IconPlus width={16} height={16} /> Add Gift
        </button>
      </div>

      <div className="card panel">
        <table className="tbl">
          <thead>
            <tr><th>Image</th><th>Name</th><th>Description</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id}>
                <td>
                  <div className="gift-row-thumb">
                    {g.image_url
                      ? <img src={assetUrl(g.image_url)} alt={g.name} />
                      : <IconGift width={20} height={20} />}
                  </div>
                </td>
                <td style={{ fontWeight: 700 }}>{g.name}</td>
                <td className="muted">{g.description}</td>
                <td>
                  <span className={`status ${g.active ? 'completed' : 'submitted'}`}>
                    {g.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="link-navy" onClick={() => { setErr(''); setModal({ mode: 'edit', data: g }); }}>Edit</span>
                  <span className="muted"> · </span>
                  <span className="link-red" onClick={() => remove(g.id)}>Delete</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 28 }}>No gifts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <GiftModal
          mode={modal.mode} initial={modal.data} error={err} setError={setErr}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}

function GiftModal({ mode, initial, onClose, onSaved, error, setError }) {
  const [name, setName] = useState(initial.name || '');
  const [description, setDescription] = useState(initial.description || '');
  const [active, setActive] = useState(initial.active !== 0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initial.image_url ? assetUrl(initial.image_url) : '');
  const [busy, setBusy] = useState(false);

  const onFile = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    setError('');
    if (!name.trim() || !description.trim()) { setError('Name and description are required.'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      fd.append('active', active ? '1' : '0');
      if (file) fd.append('image', file);

      if (mode === 'add') await api.createGift(fd);
      else await api.updateGift(initial.id, fd);
      onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === 'add' ? 'Add Gift' : 'Edit Gift'}</h3>
        <div className="wf-stack">
          <div>
            <label className="label">Image</label>
            <div className="gift-upload">
              <div className="gift-upload-preview">
                {preview ? <img src={preview} alt="" /> : <IconGift width={24} height={24} />}
              </div>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} />
            </div>
          </div>
          <div><label className="label">Name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label">Description</label><input className="field" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          {mode === 'edit' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active (visible to clients)
            </label>
          )}
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
