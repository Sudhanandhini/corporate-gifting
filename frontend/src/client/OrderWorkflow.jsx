import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import {
  IconMail, IconShield, IconGift, IconPin, IconCheck, IconCheckCircle,
} from '../lib/icons.jsx';
import './workflow.css';

const RAIL = ['Email', 'Verification', 'Gift', 'Details', 'Confirm', 'Complete'];
// map wizard step (0-6) -> rail index (0-5)
const railFor = (s) => [0, 1, 2, 2, 3, 4, 5][s];

const emptyDelivery = {
  recipient_name: '', phone: '', client_email: '',
  address: '', city: '', state: '', pincode: '', gift_message: '',
};

export default function OrderWorkflow() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [devCode, setDevCode] = useState('');
  const [gifts, setGifts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [delivery, setDelivery] = useState(emptyDelivery);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const railIdx = railFor(step);

  return (
    <div className="wf-page">
      <Link to="/admin" className="wf-adminlink">Admin →</Link>
      <div className="wf-shell">
        <header className="wf-head">
          <span className="pill">Process Overview</span>
          <h1 className="wf-title">
            Corporate Gifting <span className="gold">Client Order Workflow</span>
          </h1>
          <p className="wf-sub">
            Secure Email Verification → Gift Selection → Recipient Details → Confirmation → Order Completion
          </p>
        </header>

        {step === 0 && (
          <StepEmail
            email={email} setEmail={setEmail} busy={busy} error={error}
            onContinue={async () => {
              setError('');
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
              setBusy(true);
              try {
                const r = await api.requestOtp(email);
                setDevCode(r.devCode || '');
                setDelivery((d) => ({ ...d, client_email: email }));
                setStep(1);
              } catch (e) { setError(e.message); } finally { setBusy(false); }
            }}
          />
        )}

        {step === 1 && (
          <StepVerify
            otp={otp} setOtp={setOtp} devCode={devCode} busy={busy} error={error}
            onResend={async () => {
              setError('');
              try { const r = await api.requestOtp(email); setDevCode(r.devCode || ''); }
              catch (e) { setError(e.message); }
            }}
            onVerify={async () => {
              setError('');
              const code = otp.join('');
              if (code.length !== 5) { setError('Enter the 5-digit code.'); return; }
              setBusy(true);
              try {
                await api.verifyOtp(email, code);
                const list = await api.gifts();
                setGifts(list);
                setStep(2);
              } catch (e) { setError('Invalid or expired code.'); } finally { setBusy(false); }
            }}
          />
        )}

        {step === 2 && (
          <StepGiftCollection
            gifts={gifts}
            onSelect={(g) => { setSelected(g); setStep(3); }}
          />
        )}

        {step === 3 && selected && (
          <StepSelectGift
            gift={selected}
            onBack={() => setStep(2)}
            onConfirm={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <StepDelivery
            delivery={delivery} setDelivery={setDelivery} error={error} setError={setError}
            onBack={() => setStep(3)}
            onReview={() => {
              setError('');
              const req = ['recipient_name', 'phone', 'address', 'city', 'state', 'pincode'];
              if (req.some((f) => !delivery[f].trim())) { setError('Please fill in all required (*) fields.'); return; }
              setStep(5);
            }}
          />
        )}

        {step === 5 && (
          <StepConfirm
            gift={selected} delivery={delivery} busy={busy} error={error}
            onEdit={() => setStep(4)}
            onSubmit={async () => {
              setError('');
              setBusy(true);
              try {
                const created = await api.createOrder({
                  gift_id: selected.id, gift_name: selected.name, quantity: 1,
                  ...delivery,
                });
                setOrder(created);
                setStep(6);
              } catch (e) { setError(e.message); } finally { setBusy(false); }
            }}
          />
        )}

        {step === 6 && order && (
          <StepThankYou
            order={order} gift={selected} delivery={delivery}
            onRestart={() => {
              setStep(0); setEmail(''); setOtp(['', '', '', '', '']); setDevCode('');
              setSelected(null); setQty(1); setDelivery(emptyDelivery); setOrder(null); setError('');
            }}
          />
        )}

        <Rail activeIdx={railIdx} />
      </div>
    </div>
  );
}

/* ---------- reusable step header ---------- */
function StepHead({ icon, kicker, name, num }) {
  return (
    <>
      <div className="wf-step-head">
        <div className="wf-step-id">
          <div className="wf-step-icon">{icon}</div>
          <div>
            <div className="wf-step-kicker">{kicker}</div>
            <h2 className="wf-step-name">{name}</h2>
          </div>
        </div>
        <div className="wf-step-num">{num}</div>
      </div>
      <div className="wf-divider" />
    </>
  );
}

/* ---------- Step 1: Enter Email ---------- */
function StepEmail({ email, setEmail, onContinue, busy, error }) {
  return (
    <section className="card wf-card">
      <StepHead icon={<IconMail />} kicker="Step 01" name="Enter Email" num="01" />
      <h3 style={{ margin: '0 0 6px' }}>Welcome</h3>
      <p className="muted" style={{ marginTop: 0 }}>Enter your email address to continue.</p>
      <label className="label">Email Address</label>
      <input className="field" placeholder="name@company.com" value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onContinue()} />
      {error && <p className="error-text mt-lg">{error}</p>}
      <button className="btn btn-navy mt-lg" onClick={onContinue} disabled={busy}>
        {busy ? <span className="spinner" /> : 'Continue'}
      </button>
    </section>
  );
}

/* ---------- Step 2: Verify Email ---------- */
function StepVerify({ otp, setOtp, onVerify, onResend, devCode, busy, error }) {
  const refs = useRef([]);
  const set = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 4) refs.current[i + 1]?.focus();
  };
  const back = (i, e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus(); };

  return (
    <section className="card wf-card">
      <StepHead icon={<IconShield />} kicker="Step 02" name="Verify Email" num="02" />
      <p className="muted" style={{ marginTop: 0 }}>OTP sent to your email.</p>
      <div className="otp-row">
        {otp.map((d, i) => (
          <input key={i} ref={(el) => (refs.current[i] = el)} className="otp-box"
            inputMode="numeric" maxLength={1} value={d}
            onChange={(e) => set(i, e.target.value)} onKeyDown={(e) => back(i, e)} />
        ))}
      </div>
      {devCode && (
        <p className="muted" style={{ textAlign: 'center', marginTop: -8, fontSize: 13 }}>
          Dev mode — your code is <b>{devCode}</b>
        </p>
      )}
      <button className="btn btn-navy mt-lg" onClick={onVerify} disabled={busy}>
        {busy ? <span className="spinner" /> : 'Verify & Continue'}
      </button>
      <button className="btn btn-outline" style={{ width: '100%', marginTop: 12 }} onClick={onResend}>
        Resend OTP
      </button>
      {error && <p className="error-text mt-lg">{error}</p>}
      <div className="callout mt-lg">● Email verification is mandatory</div>
    </section>
  );
}

/* ---------- Step 3: Gift Collection ---------- */
function StepGiftCollection({ gifts, onSelect }) {
  return (
    <section className="card wf-card">
      <StepHead icon={<IconGift />} kicker="Step 03" name="Gift Collection" num="03" />
      <p className="muted" style={{ marginTop: 0 }}>Verified clients can now browse available gifts.</p>
      <div className="gift-grid mt-lg">
        {gifts.map((g) => (
          <div className="gift-tile" key={g.id}>
            <div className="gift-thumb"><IconGift width={26} height={26} /></div>
            <div className="gift-name">{g.name}</div>
            <button className="btn btn-navy" onClick={() => onSelect(g)}>Select Gift</button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Step 4: Select Your Gift ---------- */
function StepSelectGift({ gift, onConfirm, onBack }) {
  return (
    <section className="card wf-card">
      <StepHead icon={<IconGift />} kicker="Step 04" name="Select Your Gift" num="04" />
      <div className="sel-detail">
        <div className="sel-thumb"><IconGift width={40} height={40} /></div>
        <div>
          <h3 style={{ margin: '0 0 6px' }}>{gift.name}</h3>
          <p className="muted" style={{ marginTop: 0 }}>{gift.description}</p>
        </div>
      </div>
      <div className="btn-row mt-lg">
        <button className="btn btn-outline" onClick={onBack}>Back</button>
        <button className="btn btn-navy" onClick={onConfirm}>Select This Gift</button>
      </div>
    </section>
  );
}

/* ---------- Step 5: Delivery Details ---------- */
function StepDelivery({ delivery, setDelivery, onReview, onBack, error }) {
  const f = (k) => (e) => setDelivery((d) => ({ ...d, [k]: e.target.value }));
  return (
    <section className="card wf-card">
      <StepHead icon={<IconPin />} kicker="Step 05" name="Delivery Details" num="05" />
      <div className="wf-row">
        <input className="field" placeholder="Full Name *" value={delivery.recipient_name} onChange={f('recipient_name')} />
        <input className="field" placeholder="Phone Number *" value={delivery.phone} onChange={f('phone')} />
      </div>
      <div className="wf-row" style={{ marginTop: 14 }}>
        <input className="field" placeholder="Email" value={delivery.client_email} onChange={f('client_email')} />
        <input className="field" placeholder="Address *" value={delivery.address} onChange={f('address')} />
      </div>
      <div className="wf-row" style={{ marginTop: 14 }}>
        <input className="field" placeholder="City *" value={delivery.city} onChange={f('city')} />
        <input className="field" placeholder="State *" value={delivery.state} onChange={f('state')} />
      </div>
      <div className="wf-row" style={{ marginTop: 14 }}>
        <input className="field" placeholder="Pincode *" value={delivery.pincode} onChange={f('pincode')} />
        <input className="field" placeholder="Gift Message" value={delivery.gift_message} onChange={f('gift_message')} />
      </div>
      {error && <p className="error-text mt-lg">{error}</p>}
      <div className="btn-row mt-lg">
        <button className="btn btn-outline" onClick={onBack}>Back</button>
        <button className="btn btn-navy" onClick={onReview}>Review &amp; Confirm</button>
      </div>
    </section>
  );
}

/* ---------- Step 6: Confirm Your Details ---------- */
function StepConfirm({ gift, delivery, onSubmit, onEdit, busy, error }) {
  return (
    <section className="card wf-card" style={{ borderColor: 'var(--gold-500)', boxShadow: '0 0 0 3px var(--gold-100)' }}>
      <StepHead icon={<IconCheckCircle />} kicker="Step 06 · Key Step" name="Confirm Your Details" num="06" />
      <div className="review-list">
        <Row k="Selected Gift" v={gift.name} />
        <Row k="Recipient Name" v={delivery.recipient_name} />
        <Row k="Phone Number" v={delivery.phone} />
        <Row k="Delivery Address" v={`${delivery.address}, ${delivery.city}`} />
        <Row k="State" v={delivery.state} />
        <Row k="Pincode" v={delivery.pincode} />
        <Row k="Gift Message" v={delivery.gift_message || '—'} />
      </div>
      <div className="callout mt-lg">
        ⚠ Please check your phone number and delivery address carefully before submitting.
      </div>
      {error && <p className="error-text mt-lg">{error}</p>}
      <div className="btn-row mt-lg">
        <button className="btn btn-outline" onClick={onEdit}>Edit Details</button>
        <button className="btn btn-gold" onClick={onSubmit} disabled={busy}>
          {busy ? <span className="spinner" style={{ borderTopColor: 'var(--navy-900)' }} /> : 'Confirm & Submit'}
        </button>
      </div>
    </section>
  );
}

/* ---------- Step 7: Thank You ---------- */
function StepThankYou({ order, gift, delivery, onRestart }) {
  return (
    <section className="card wf-card">
      <StepHead icon={<IconCheck />} kicker="Step 07" name="Thank You!" num="07" />
      <div className="ty-center">
        <div className="ty-badge"><IconCheck width={34} height={34} /></div>
        <p className="muted" style={{ margin: 0 }}>Your gift order has been successfully submitted.</p>
      </div>
      <div className="ty-order">Order ID: #{order.order_code}</div>
      <div className="review-list">
        <Row k="Product" v={gift.name} />
        <Row k="Recipient" v={delivery.recipient_name} />
        <Row k="Phone" v={delivery.phone} />
        <Row k="Delivery" v={`${delivery.city}, ${delivery.state}`} />
      </div>
      <div style={{ marginTop: 16 }}>
        <span className="status completed">Order Submitted</span>
      </div>
      <button className="btn btn-outline" style={{ width: '100%', marginTop: 18 }} onClick={onRestart}>
        Place Another Order
      </button>
    </section>
  );
}

function Row({ k, v }) {
  return (<div className="r"><span className="k">{k}</span><span className="v">{v}</span></div>);
}

/* ---------- progress rail ---------- */
function Rail({ activeIdx }) {
  return (
    <div className="rail">
      {RAIL.map((label, i) => (
        <div key={label} className={`rail-node ${i < activeIdx ? 'done' : ''} ${i === activeIdx ? 'active' : ''}`}>
          <div className="rail-dot" />
          <div className="rail-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
