import { NavLink, Outlet, Link } from 'react-router-dom';
import { IconBriefcase, IconGrid, IconUsers, IconReceipt, IconLogout } from '../lib/icons.jsx';
import './admin.css';

export default function AdminLayout() {
  return (
    <div className="admin">
      <aside className="side">
        <div className="side-brand">
          <div className="ico"><IconBriefcase /></div>
          <div className="name">Corporate<br />Gifting</div>
        </div>

        <div className="side-menu-label">Main Menu</div>
        <NavLink end to="/admin" className="side-link">
          <span className="ico"><IconGrid width={18} height={18} /></span> Dashboard <span className="n">01</span>
        </NavLink>
        <NavLink to="/admin/employees" className="side-link">
          <span className="ico"><IconUsers width={18} height={18} /></span> Employees <span className="n">02</span>
        </NavLink>
        <NavLink to="/admin/orders" className="side-link">
          <span className="ico"><IconReceipt width={18} height={18} /></span> Orders <span className="n">03</span>
        </NavLink>

        <div className="side-foot">
          <Link to="/"><IconLogout width={18} height={18} /> Exit to Client</Link>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
