import { useEffect, useState } from 'react';
import { api, assetUrl } from '../lib/api.js';
import { IconFileText, IconDownload, IconTrash } from '../lib/icons.jsx';
import Pagination from './Pagination.jsx';

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
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = () => api.reports(page)
    .then((r) => { setRows(r.rows); setTotal(r.total); setPageSize(r.pageSize); })
    .catch((e) => setErr(e.message))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, [page]);

  // While a report on this page is still generating in the background, poll
  // for it to finish instead of making the admin manually refresh.
  const hasPending = rows.some((r) => r.status === 'pending');
  useEffect(() => {
    if (!hasPending) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPending, page]);

  const remove = async (id) => {
    if (!confirm('Delete this report? The Excel file will be removed.')) return;
    await api.deleteReport(id);
    load();
  };

  return (
    <>
      <div className="main-head">
        <div><h1>Reports</h1><div className="sub">Excel exports generated from the Orders and Employees pages</div></div>
      </div>

      <div className="card panel">
        {err && <p className="error-text">{err}</p>}
        <table className="tbl">
          <thead>
            <tr>
              <th>Report</th><th>Date Range</th><th>Filters</th><th>Rows</th><th>Status</th>
              <th>Generated</th><th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="gift-row-thumb"><IconFileText width={18} height={18} /></div>
                    <span style={{ fontWeight: 700 }}>
                      {r.status === 'ready' ? r.filename : r.status === 'pending' ? 'Generating export…' : 'Export failed'}
                    </span>
                  </div>
                </td>
                <td>{rangeLabel(r)}</td>
                <td className="muted">
                  {r.status_filter || '—'}{r.search_filter ? ` · "${r.search_filter}"` : ''}
                </td>
                <td>{r.status === 'ready' ? r.row_count : '—'}</td>
                <td>
                  <span className={`status ${r.status === 'pending' ? 'processing' : r.status === 'failed' ? 'cancelled' : 'completed'}`}>
                    {r.status === 'pending' ? 'Generating…' : r.status === 'failed' ? 'Failed' : 'Ready'}
                  </span>
                </td>
                <td className="muted">{fmtDateTime(r.created_at)}</td>
                <td style={{ textAlign: 'right' }}>
                  {r.status === 'ready' ? (
                    <a className="link-navy" href={assetUrl(r.file_url)} download={r.filename}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <IconDownload width={14} height={14} /> Download
                    </a>
                  ) : (
                    <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {r.status === 'pending' && <span className="spinner" style={{ width: 12, height: 12 }} />}
                      {r.status === 'pending' ? 'Generating…' : 'Unavailable'}
                    </span>
                  )}
                  <span className="muted"> · </span>
                  <span className="link-red" onClick={() => remove(r.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <IconTrash width={14} height={14} /> Delete
                  </span>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                No reports yet. Export orders from the Orders page to generate one.
              </td></tr>
            )}
          </tbody>
        </table>

        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      </div>
    </>
  );
}
