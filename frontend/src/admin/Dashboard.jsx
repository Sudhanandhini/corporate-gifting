import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { IconUsers, IconReceipt, IconClock, IconCheckCircle, IconCalendar } from '../lib/icons.jsx';

const fmt = (n) => new Intl.NumberFormat('en-US').format(n);
const shortDate = (s) => new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
const statusClass = (s) => s.toLowerCase();

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.stats().then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="error-text">Could not load dashboard: {err}</p>;
  if (!data) return <p className="muted">Loading dashboard…</p>;

  const { kpis, recentOrders, last7Days, statusBreakdown: sb } = data;
  const maxDay = Math.max(1, ...last7Days.map((d) => d.count));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="main-head">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">Overview of gifting activity</div>
        </div>
        <span className="urlbar"><IconCalendar width={15} height={15} />
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <div className="kpis">
        <Kpi ico={<IconUsers />} tone="navy" num={fmt(kpis.totalEmployees)} label="Total Employees" />
        <Kpi ico={<IconReceipt />} tone="gold" num={fmt(kpis.totalOrders)} label="Total Orders" />
        <Kpi ico={<IconClock />} tone="amber" num={fmt(kpis.pendingOrders)} label="Pending Orders" />
        <Kpi ico={<IconCheckCircle />} tone="green" num={fmt(kpis.completedOrders)} label="Completed Orders" />
      </div>

      <div className="card panel">
        <div className="section-head">
          <h2>Recent Orders</h2>
          <Link to="/admin/orders" className="link-gold">View All Orders ›</Link>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Order ID</th><th>Employee</th><th>Gift</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.order_code}>
                <td className="oid">#{o.order_code}</td>
                <td>{o.recipient_name}</td>
                <td>{o.gift_name}</td>
                <td>{shortDate(o.created_at)}</td>
                <td><span className={`status ${statusClass(o.status)}`}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-2">
        <div className="card panel">
          <h3>Orders — Last 7 Days</h3>
          <div className="bars">
            {last7Days.map((d) => (
              <div className="bar-col" key={d.date}>
                <div className={`bar ${d.date === today ? 'today' : ''}`}
                  style={{ height: `${(d.count / maxDay) * 100}%` }} title={`${d.count} orders`} />
                <div className="bar-x">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card panel">
          <div className="section-head" style={{ margin: 0 }}>
            <h3 style={{ margin: 0 }}>Order Status</h3>
            <span className="muted">{fmt(sb.total)} total</span>
          </div>
          <div className="track" style={{ marginTop: 18 }}>
            <i style={{ width: `${sb.completedPct}%` }} />
          </div>
          <div className="legend-row green">
            <span className="dot">Completed</span>
            <span className="muted">{fmt(sb.completed)} · {sb.completedPct}%</span>
          </div>
          <div className="legend-row amber">
            <span className="dot">Pending</span>
            <span className="muted">{fmt(sb.pending)} · {sb.pendingPct}%</span>
          </div>
        </div>
      </div>
    </>
  );
}

function Kpi({ ico, tone, num, label }) {
  return (
    <div className="card kpi">
      <div className={`kpi-ico ${tone}`}>{ico}</div>
      <div className="kpi-num">{num}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
