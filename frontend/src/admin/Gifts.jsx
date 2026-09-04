import { useEffect, useRef, useState } from 'react';
import { api, assetUrl } from '../lib/api.js';
import { IconGift, IconPlus } from '../lib/icons.jsx';

const empty = { name: '', description: '', active: 1 };

export default function Gifts() {
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(null); // null | {mode, data}
  const [err, setErr] = useState('');
  const dragId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const load = () => api.adminGifts().then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Delete this gift?')) return;
    await api.deleteGift(id);
    load();
  };

  const onDragStart = (id) => (e) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (id) => (e) => {
    e.preventDefault();
    if (id !== dragOverId) setDragOverId(id);
  };
  const onDrop = (targetId) => async (e) => {
    e.preventDefault();
    setDragOverId(null);
    const fromId = dragId.current;
    dragId.current = null;
    if (fromId == null || fromId === targetId) return;
    const fromIdx = rows.findIndex((r) => r.id === fromId);
    const toIdx = rows.findIndex((r) => r.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const prev = rows;
    const next = [...rows];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setRows(next);
    try {
      await api.reorderGifts(next.map((r) => r.id));
    } catch (e2) {
      setErr(e2.message);
      setRows(prev);
    }
  };

  return (
    <>
      <div className="main-head">
        <div><h1>Gifts</h1><div className="sub">Manage the gift catalogue — drag rows to reorder</div></div>
        <button className="btn btn-navy" style={{ width: 'auto' }}
          onClick={() => { setErr(''); setModal({ mode: 'add', data: empty }); }}>
          <IconPlus width={16} height={16} /> Add Gift
        </button>
      </div>

      <div className="card panel">
        <table className="tbl">
          <thead>
            <tr><th></th><th>Image</th><th>Name</th><th>Description</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id}
                className={dragOverId === g.id ? 'drag-over' : ''}
                draggable
                onDragStart={onDragStart(g.id)}
                onDragOver={onDragOver(g.id)}
                onDragLeave={() => setDragOverId((id) => (id === g.id ? null : id))}
                onDrop={onDrop(g.id)}
                onDragEnd={() => { dragId.current = null; setDragOverId(null); }}
              >
                <td className="drag-handle" title="Drag to reorder">⠿</td>
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
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 28 }}>No gifts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {err && <p className="error-text" style={{ marginTop: 14 }}>{err}</p>}

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

const MAX_IMAGES = 20;

let newItemSeq = 0;

// Turns the gift's saved images into draggable items. `id` is null for a
// legacy cover image that predates the multi-image gallery — it can be
// removed but not reordered, since it has no gift_images row of its own.
const toExistingItems = (images) => (images || []).map((img) => ({
  key: `existing-${img.id ?? img.image_url}`, kind: 'existing', id: img.id, image_url: img.image_url,
  title: img.title || '',
}));

function GiftModal({ mode, initial, onClose, onSaved, error, setError }) {
  const [name, setName] = useState(initial.name || '');
  const [description, setDescription] = useState(initial.description || '');
  const [active, setActive] = useState(initial.active !== 0);
  // One ordered list mixing already-saved images and newly picked files, so
  // drag-and-drop can reorder both together before saving.
  const [items, setItems] = useState(() => toExistingItems(initial.images));
  const [busy, setBusy] = useState(false);
  const dragKey = useRef(null);
  const [dragOverKey, setDragOverKey] = useState(null);

  const onFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;
    setItems((cur) => {
      const room = MAX_IMAGES - cur.length;
      const added = picked.slice(0, room).map((file) => ({ key: `new-${newItemSeq++}`, kind: 'new', file, title: '' }));
      return [...cur, ...added];
    });
  };
  const removeItem = (key) => setItems((cur) => cur.filter((i) => i.key !== key));
  const setItemTitle = (key, title) => setItems((cur) => cur.map((i) => (i.key === key ? { ...i, title } : i)));

  const onDragStart = (key) => (e) => {
    dragKey.current = key;
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (key) => (e) => {
    e.preventDefault();
    if (key !== dragOverKey) setDragOverKey(key);
  };
  const onDrop = (targetKey) => (e) => {
    e.preventDefault();
    setDragOverKey(null);
    const from = dragKey.current;
    dragKey.current = null;
    if (!from || from === targetKey) return;
    setItems((cur) => {
      const fromIdx = cur.findIndex((i) => i.key === from);
      const toIdx = cur.findIndex((i) => i.key === targetKey);
      if (fromIdx === -1 || toIdx === -1) return cur;
      const next = [...cur];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
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

      const newItems = items.filter((i) => i.kind === 'new');
      newItems.forEach((i) => fd.append('images', i.file));
      fd.append('newTitles', JSON.stringify(newItems.map((i) => i.title.trim())));

      // "existing:<id>" / "new:<upload index>" tokens, in the on-screen drag
      // order; the legacy id-less cover can't be reordered so it's skipped.
      const order = items
        .filter((i) => i.kind === 'new' || i.id != null)
        .map((i) => (i.kind === 'existing' ? `existing:${i.id}` : `new:${newItems.indexOf(i)}`));
      fd.append('imageOrder', JSON.stringify(order));

      if (mode === 'edit') {
        const keptIds = new Set(items.filter((i) => i.kind === 'existing' && i.id != null).map((i) => i.id));
        const removedIds = (initial.images || [])
          .filter((img) => img.id != null && !keptIds.has(img.id))
          .map((img) => img.id);
        fd.append('removeImageIds', JSON.stringify(removedIds));
        const hadLegacyCover = (initial.images || []).some((img) => img.id == null);
        const keepsLegacyCover = items.some((i) => i.kind === 'existing' && i.id == null);
        fd.append('removeCover', (hadLegacyCover && !keepsLegacyCover) ? 'true' : 'false');

        const existingTitles = Object.fromEntries(
          items.filter((i) => i.kind === 'existing' && i.id != null).map((i) => [i.id, i.title.trim()])
        );
        fd.append('existingTitles', JSON.stringify(existingTitles));
      }

      if (mode === 'add') await api.createGift(fd);
      else await api.updateGift(initial.id, fd);
      onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal gift-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === 'add' ? 'Add Gift' : 'Edit Gift'}</h3>
        <div className="wf-stack">
          <div>
            <label className="label">Images (up to {MAX_IMAGES}) — drag to reorder, title each item</label>
            <div className="gift-upload-grid">
              {items.map((item) => (
                <div key={item.key} className="gift-upload-card">
                  <div
                    className={`gift-upload-thumb ${dragOverKey === item.key ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={onDragStart(item.key)}
                    onDragOver={onDragOver(item.key)}
                    onDragLeave={() => setDragOverKey((k) => (k === item.key ? null : k))}
                    onDrop={onDrop(item.key)}
                    onDragEnd={() => { dragKey.current = null; setDragOverKey(null); }}
                  >
                    <img src={item.kind === 'existing' ? assetUrl(item.image_url) : URL.createObjectURL(item.file)} alt="" />
                    <button type="button" className="gift-upload-remove" onClick={() => removeItem(item.key)}>×</button>
                  </div>
                  <input
                    className="gift-upload-title" type="text" placeholder="Title"
                    value={item.title} onChange={(e) => setItemTitle(item.key, e.target.value)}
                  />
                </div>
              ))}
              {items.length < MAX_IMAGES && (
                <label className="gift-upload-add">
                  <IconPlus width={18} height={18} />
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={onFiles} hidden />
                </label>
              )}
              {items.length === 0 && <IconGift width={24} height={24} className="muted" />}
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
