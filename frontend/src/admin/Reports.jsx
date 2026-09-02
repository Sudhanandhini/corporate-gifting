import { useEffect, useState } from 'react';
import { api, assetUrl } from '../lib/api.js';
import { IconFileText, IconDownload, IconTrash } from '../lib/icons.jsx';

const fmtDate = (s) => new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = (s) => new Date(s).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const rangeLabel = (r) => {
  if (r.date_from && r.date_to) return `${fmtDate(r.date_from)} – ${fmtDate(r.date_to)}`;
  if (r.date_from) return `From ${fmtDate(r.date_from)}`;
  if (r.date_to) return `Up to ${fmtDate(r.date_to)}`;
  return 'All dates';
};

export default function Reports() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = () => api.reports().then(setRows).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Delete this report? The Excel file will be removed.')) return;
    await api.deleteReport(id);
    load();
  };

  return (
    <>
      <div className="main-head">
        <div><h1>Reports</h1><div className="sub">Excel exports generated from the Orders page</div></div>
      </div>

      <div className="card panel">
        {err && <p className="error-text">{err}</p>}
        <table className="tbl">
          <thead>
            <tr>
              <th>Report</th><th>Date Range</th><th>Filters</th><th>Rows</th>
              <th>Generated</th><th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="gift-row-thumb"><IconFileText width={18} height={18} /></div>
                    <span style={{ fontWeight: 700 }}>{r.filename}</span>
                  </div>
                </td>
                <td>{rangeLabel(r)}</td>
                <td className="muted">
                  {r.status_filter || '—'}{r.search_filter ? ` · "${r.search_filter}"` : ''}
                </td>
                <td>{r.row_count}</td>
                <td className="muted">{fmtDateTime(r.created_at)}</td>
                <td style={{ textAlign: 'right' }}>
                  <a className="link-navy" href={assetUrl(r.file_url)} download={r.filename}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <IconDownload width={14} height={14} /> Download
                  </a>
                  <span className="muted"> · </span>
                  <span className="link-red" onClick={() => remove(r.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <IconTrash width={14} height={14} /> Delete
                  </span>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                No reports yet. Export orders from the Orders page to generate one.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
