import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { IconBriefcase, IconGrid, IconUsers, IconReceipt, IconGift, IconLogout } from '../lib/icons.jsx';
import { adminAuth } from '../lib/api.js';
import './admin.css';

export default function AdminLayout() {
  const navigate = useNavigate();
  const logout = () => { adminAuth.clear(); navigate('/admin/login', { replace: true }); };

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
        <NavLink to="/admin/gifts" className="side-link">
          <span className="ico"><IconGift width={18} height={18} /></span> Gifts <span className="n">04</span>
        </NavLink>

        <div className="side-foot">
          <button type="button" onClick={logout} className="side-logout">
            <IconLogout width={18} height={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
