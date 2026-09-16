// Simple prev/next pager shared by the Orders and Employees lists.
export default function Pagination({ page, pageSize, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <span className="muted">Showing {from}–{to} of {total}</span>
      <div className="pagination-nav">
        <button type="button" className="btn btn-outline" style={{ width: 'auto' }}
          onClick={() => onChange(page - 1)} disabled={page <= 1}>
          ‹ Prev
        </button>
        <span className="muted">Page {page} of {totalPages}</span>
        <button type="button" className="btn btn-outline" style={{ width: 'auto' }}
          onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          Next ›
        </button>
      </div>
    </div>
  );
}
