import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, adminAuth } from '../lib/api.js';
import { IconShield, IconBriefcase } from '../lib/icons.jsx';
import '../client/workflow.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) { setError('Enter username and password.'); return; }
    setBusy(true);
    try {
      const r = await api.adminLogin(username.trim(), password);
      adminAuth.setToken(r.token);
      const dest = location.state?.from || '/admin';
      navigate(dest, { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wf-page" style={{ display: 'grid', placeItems: 'center' }}>
      <div className="wf-shell" style={{ maxWidth: 440 }}>
        <header className="wf-head">
          <span className="pill"><IconBriefcase width={14} height={14} /> Admin Console</span>
          <h1 className="wf-title">Corporate Gifting <span className="gold">Admin Login</span></h1>
          <p className="wf-sub">Sign in to manage employees, gifts and orders.</p>
        </header>

        <section className="card wf-card">
          <div className="wf-step-head">
            <div className="wf-step-id">
              <div className="wf-step-icon"><IconShield /></div>
              <div>
                <div className="wf-step-kicker">Secure Access</div>
                <h2 className="wf-step-name">Sign In</h2>
              </div>
            </div>
          </div>
          <div className="wf-divider" />

          <form onSubmit={onSubmit}>
            <label className="label">Username</label>
            <input
              className="field" placeholder="admin" value={username} autoFocus
              onChange={(e) => setUsername(e.target.value)}
            />
            <label className="label" style={{ marginTop: 14 }}>Password</label>
            <input
              className="field" type="password" placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="error-text mt-lg">{error}</p>}
            <button className="btn btn-navy mt-lg" type="submit" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Log In'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
