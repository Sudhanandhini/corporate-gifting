import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, assetUrl } from '../lib/api.js';
import {
  IconMail, IconShield, IconGift, IconPin, IconCheck, IconCheckCircle, IconLogout,
} from '../lib/icons.jsx';
import logo from '../images/logo.png';
import './workflow.css';

const RAIL = ['Email', 'Verification', 'Gift', 'Details', 'Confirm', 'Complete'];
// map wizard step (0-6) -> rail index (0-5)
const railFor = (s) => [0, 1, 2, 2, 3, 4, 5][s];

const ENTITIES = [
  'Randstad Digital Private Limited',
  'Randstad Enterprise Pvt. Ltd.',
  'Randstad India Private Limited',
];

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const emptyDelivery = {
  recipient_name: '', last_name: '', phone: '', client_email: '', employee_id: '', entity: '',
  address: '', city: '', state: '', pincode: '',
};

// Keeps a verified client on their current step across a page refresh (or a
// closed tab) for 15 minutes of inactivity, without re-verifying the OTP.
const SESSION_KEY = 'cg_client_wf';
const SESSION_TTL_MS = 15 * 60 * 1000;

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.expiresAt || Date.now() > data.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}
function saveSession(data) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, expiresAt: Date.now() + SESSION_TTL_MS })); }
  catch { /* ignore */ }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export default function OrderWorkflow() {
  const saved = loadSession();
  const [step, setStep] = useState(saved?.step ?? 0);
  const [email, setEmail] = useState(saved?.email ?? '');
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [devCode, setDevCode] = useState('');
  const [gifts, setGifts] = useState([]);
  const [selected, setSelected] = useState(saved?.selected ?? null);
  const [delivery, setDelivery] = useState(saved?.delivery ?? emptyDelivery);
  const [order, setOrder] = useState(saved?.order ?? null);
  const [alreadyPlaced, setAlreadyPlaced] = useState(saved?.alreadyPlaced ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const railIdx = railFor(step);

  const handleLogout = () => {
    clearSession();
    setStep(0);
    setEmail('');
    setOtp(['', '', '', '', '']);
    setDevCode('');
    setGifts([]);
    setSelected(null);
    setDelivery(emptyDelivery);
    setOrder(null);
    setAlreadyPlaced(false);
    setError('');
  };

  // Persist progress (sliding 15-min window) once the user has verified their email.
  useEffect(() => {
    if (step === 0) { clearSession(); return; }
    saveSession({ step, email, selected, delivery, order, alreadyPlaced });
  }, [step, email, selected, delivery, order, alreadyPlaced]);

  // Resuming on the gift-collection step after a refresh needs the list reloaded.
  useEffect(() => {
    if (step === 2 && gifts.length === 0) {
      api.gifts().then(setGifts).catch((e) => setError(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wf-page">
      {/* <Link to="/admin" className="wf-adminlink">Admin →</Link> */}
      {step >= 2 && step <= 6 && (
        <button type="button" className="wf-logout" onClick={handleLogout}>
          <IconLogout width={16} height={16} /> Logout
        </button>
      )}
      <div className="wf-shell">
        <header className="wf-head">
          {/* <span className="pill">Process Overview</span> */}
           <img src={logo} alt="Randstad" className="wf-logo" />
          <h1 className="wf-title">
            <span className="gold">Season of Happiness</span>
          </h1>
          {/* <p className="wf-sub">
            Secure Email Verification → Gift Selection → Recipient Details → Confirmation → Order Completion
          </p> */}
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
                const r = await api.verifyOtp(email, code);
                if (r.employee) {
                  setDelivery((d) => ({
                    ...d,
                    recipient_name: r.employee.first_name || '',
                    last_name: r.employee.last_name || '',
                    employee_id: r.employee.employee_id || '',
                  }));
                }
                if (r.existingOrder) {
                  setOrder(r.existingOrder);
                  setAlreadyPlaced(true);
                  setStep(6);
                } else {
                  const list = await api.gifts();
                  setGifts(list);
                  setStep(2);
                }
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
            delivery={delivery} setDelivery={setDelivery} error={error} setError={setError} busy={busy}
            onBack={() => setStep(3)}
            onReview={async () => {
              setError('');
              const req = ['recipient_name', 'last_name', 'phone', 'employee_id', 'entity', 'address', 'city', 'state', 'pincode'];
              if (req.some((f) => !delivery[f].trim())) { setError('Please fill in all required (*) fields.'); return; }
              if (delivery.phone.length !== 10) { setError('Phone number must be exactly 10 digits.'); return; }
              if (delivery.pincode.length !== 6) { setError('Pincode must be exactly 6 digits.'); return; }
              setBusy(true);
              try {
                const r = await fetch(`https://api.postalpincode.in/pincode/${delivery.pincode}`);
                const data = await r.json();
                const offices = data?.[0]?.PostOffice;
                if (offices?.length) {
                  const enteredState = delivery.state.trim().toLowerCase();
                  const enteredCity = delivery.city.trim().toLowerCase();
                  const stateMatch = offices.some((po) => po.State.toLowerCase() === enteredState);
                  if (!stateMatch) {
                    setError(`Pincode ${delivery.pincode} belongs to ${offices[0].State}, not ${delivery.state}. Please correct the Pincode, City or State.`);
                    setBusy(false);
                    return;
                  }
                  const cityMatch = offices.some((po) => [po.District, po.Name, po.Block].filter(Boolean)
                    .some((n) => n.toLowerCase().includes(enteredCity) || enteredCity.includes(n.toLowerCase())));
                  if (!cityMatch) {
                    setError(`Pincode ${delivery.pincode} does not match the city "${delivery.city}". Please correct the Pincode, City or State.`);
                    setBusy(false);
                    return;
                  }
                }
              } catch { /* lookup unavailable — don't block submission */ }
              setBusy(false);
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
                setOrder({
                  gift_name: selected.name,
                  recipient_name: delivery.recipient_name,
                  phone: delivery.phone,
                  city: delivery.city,
                  state: delivery.state,
                  status: created.status || 'Submitted',
                });
                setAlreadyPlaced(false);
                setStep(6);
              } catch (e) { setError(e.message); } finally { setBusy(false); }
            }}
          />
        )}

        {step === 6 && order && (
          <StepThankYou order={order} alreadyPlaced={alreadyPlaced} />
        )}

        <p className="wf-contact">
          Can&apos;t log in? Contact <a href="mailto:contact@gift.com">contact@gift.com</a>
        </p>

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

/* ---------- reusable image slider ---------- */
// Normalizes a gift's images into {url, title}[]. Handles the current API
// shape, legacy plain-string arrays, and gifts with only the old single
// cover image.
function giftImages(g) {
  if (g?.images?.length) {
    return g.images.map((img) => (typeof img === 'string' ? { url: img, title: null } : img));
  }
  return g?.image_url ? [{ url: g.image_url, title: null }] : [];
}

function ImageSlider({ images, alt, className = '', onIndexChange, showThumbnails = false }) {
  const [idx, setIdx] = useState(0);
  const rootRef = useRef(null);

  useEffect(() => { onIndexChange?.(idx); }, [idx, onIndexChange]);

  if (!images.length) {
    return <div className={`img-slider ${className}`}><IconGift width={26} height={26} /></div>;
  }
  const go = (delta) => (e) => {
    e.stopPropagation();
    setIdx((i) => (i + delta + images.length) % images.length);
  };
  const current = images[idx];
  const withThumbs = showThumbnails && images.length > 1;
  const slider = (
    <div ref={rootRef} className={`img-slider ${className}`}>
      <img src={assetUrl(current.url)} alt={current.title || alt} />
      {(current.title || (images.length > 1 && !withThumbs)) && (
        <div className="img-slider-bottom">
          {current.title && <div className="img-slider-caption">{current.title}</div>}
          {images.length > 1 && !withThumbs && (
            <div className="img-slider-dots">
              {images.map((_, i) => (
                <span key={i} className={`img-slider-dot ${i === idx ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setIdx(i); }} />
              ))}
            </div>
          )}
        </div>
      )}
      {images.length > 1 && (
        <>
          <button type="button" className="img-slider-nav prev" onClick={go(-1)} aria-label="Previous image">‹</button>
          <button type="button" className="img-slider-nav next" onClick={go(1)} aria-label="Next image">›</button>
        </>
      )}
    </div>
  );
  if (!withThumbs) return slider;
  return (
    <div className="img-slider-wrap">
      {slider}
      <div className="img-slider-thumbs">
        {images.map((img, i) => (
          <button type="button" key={i} className={`img-slider-thumb ${i === idx ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setIdx(i); }} aria-label={img.title || `View image ${i + 1}`}>
            <img src={assetUrl(img.url)} alt={img.title || alt} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- gift preview modal (opened via "View More") ---------- */
function GiftPreviewModal({ gift, onClose, onSelect }) {
  const images = giftImages(gift);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeTitle = images[activeIdx]?.title || gift.name;
  return (
    <div className="wf-modal-bg" onClick={onClose}>
      <div className="wf-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="wf-modal-close" onClick={onClose} aria-label="Close">×</button>
        <ImageSlider images={images} alt={gift.name} className="gift-preview-slider" onIndexChange={setActiveIdx} showThumbnails />
        <h3 style={{ margin: '16px 0 6px' }}>{activeTitle}</h3>
        <p className="muted" style={{ marginTop: 0 }}>{gift.description}</p>
        <button className="btn btn-navy mt-lg" onClick={() => { onSelect(gift); onClose(); }}>
          Select This Gift
        </button>
      </div>
    </div>
  );
}

/* ---------- Step 3: Gift Collection ---------- */
function StepGiftCollection({ gifts, onSelect }) {
  const [previewGift, setPreviewGift] = useState(null);
  return (
    <section className="card wf-card">
      <StepHead icon={<IconGift />} kicker="Step 03" name="Gift Collection" num="03" />
      <p className="muted" style={{ marginTop: 0 }}>Verified clients can now browse available gifts.</p>
      <div className="gift-grid mt-lg">
        {gifts.map((g) => (
          <div className="gift-tile" key={g.id}>
            {giftImages(g).length ? (
              <div className="img-slider gift-thumb">
                <img src={assetUrl(giftImages(g)[0].url)} alt={g.name} />
              </div>
            ) : (
              <div className="img-slider gift-thumb"><IconGift width={26} height={26} /></div>
            )}
            <div className="gift-name">{g.name}</div>
            <p className="gift-desc">{g.description}</p>
            <span className="gift-viewmore" onClick={() => setPreviewGift(g)}>View More</span>
            <button className="btn btn-navy" onClick={() => onSelect(g)}>Select Gift</button>
          </div>
        ))}
      </div>
      {previewGift && (
        <GiftPreviewModal gift={previewGift} onClose={() => setPreviewGift(null)} onSelect={onSelect} />
      )}
    </section>
  );
}

/* ---------- Step 4: Select Your Gift ---------- */
function StepSelectGift({ gift, onConfirm, onBack }) {
  const images = giftImages(gift);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeTitle = images[activeIdx]?.title || gift.name;
  return (
    <section className="card wf-card">
      <StepHead icon={<IconGift />} kicker="Step 04" name="Select Your Gift" num="04" />
      <div className="sel-detail">
        <ImageSlider images={images} alt={gift.name} className="sel-thumb" onIndexChange={setActiveIdx} showThumbnails />
        <div>
          <h3 style={{ margin: '0 0 6px', fontSize:'20px' }}>{activeTitle}</h3>
          <p className="muted" style={{ marginTop: 0 }}>{gift.description}</p>
          {images.length > 1 && (
            <ul className="sel-image-list">
              {images.map((img, i) => (
                <li key={i} className={i === activeIdx ? 'active' : ''}>{img.title || gift.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="btn-row mt-lg">
        <button className="btn1 btn-outline" onClick={onBack}>Back</button>
        <button className="btn1 btn-navy" onClick={onConfirm}>Select This Gift</button>
      </div>
    </section>
  );
}

/* ---------- Step 5: Delivery Details ---------- */
function StepDelivery({ delivery, setDelivery, onReview, onBack, error, busy }) {
  const f = (k) => (e) => setDelivery((d) => ({ ...d, [k]: e.target.value }));
  const fLetters = (k) => (e) => {
    const v = e.target.value.replace(/[^A-Za-z\s]/g, '');
    setDelivery((d) => ({ ...d, [k]: v }));
  };
  const fDigits = (k, maxLen) => (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, maxLen);
    setDelivery((d) => ({ ...d, [k]: v }));
  };
  const fAlphaNum = (k, maxLen) => (e) => {
    const v = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, maxLen);
    setDelivery((d) => ({ ...d, [k]: v }));
  };

  // Auto-fill city/state once the pincode is fully typed.
  useEffect(() => {
    if (delivery.pincode.length !== 6) return;
    let cancelled = false;
    fetch(`https://api.postalpincode.in/pincode/${delivery.pincode}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const po = data?.[0]?.PostOffice?.[0];
        if (!po) return;
        const matchedState = INDIAN_STATES.find(
          (s) => s.toLowerCase() === po.State.toLowerCase()
        ) || po.State;
        setDelivery((d) => ({ ...d, city: po.District || d.city, state: matchedState || d.state }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [delivery.pincode]);

  return (
    <section className="card wf-card">
      <StepHead icon={<IconPin />} kicker="Step 05" name="Delivery Details" num="05" />
      <div className="wf-row">
        <input className="field" placeholder="Full Name *" value={delivery.recipient_name} onChange={fLetters('recipient_name')} readOnly={!!delivery.recipient_name} />
          <input className="field" placeholder="Last Name *" value={delivery.last_name} onChange={fLetters('last_name')} readOnly={!!delivery.last_name} />

      </div>
      <div className="wf-row" style={{ marginTop: 14 }}>
        <input className="field" placeholder="Employee ID *" value={delivery.employee_id} onChange={fAlphaNum('employee_id', 10)} maxLength={10} readOnly={!!delivery.employee_id} />
        <select className="field" value={delivery.entity} onChange={f('entity')}>
          <option value="">Select Entity *</option>
          {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <div className="wf-row" style={{ marginTop: 14 }}>
         <input className="field" placeholder="Phone Number *" value={delivery.phone} onChange={fDigits('phone', 10)} type="tel" inputMode="numeric" maxLength={10} />
        <input className="field" placeholder="Email" value={delivery.client_email} onChange={f('client_email')} readOnly={!!delivery.client_email} />

      </div>

           <div className="wf-row" style={{ marginTop: 14 }}>
         
        <input className="field" placeholder="Pincode *" value={delivery.pincode} onChange={fDigits('pincode', 6)} type="tel" inputMode="numeric" maxLength={6} />
 <select className="field" value={delivery.state} onChange={f('state')}>
            <option value="">Select State *</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
      </div>
      <div className="wf-row" style={{ marginTop: 14 }}>
        
        <input className="field" placeholder="City *" value={delivery.city} onChange={fLetters('city')} />
       <input className="field" placeholder="Address *" value={delivery.address} onChange={f('address')} />
      </div>
 
      {error && <p className="error-text mt-lg">{error}</p>}
      <div className="btn-row mt-lg">
        <button className="btn1 btn-outline" onClick={onBack} disabled={busy}>Back</button>
        <button className="btn1 btn-navy" onClick={onReview} disabled={busy}>
          {busy ? <span className="spinner" /> : 'Review & Confirm'}
        </button>
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
        <Row k="Last Name" v={delivery.last_name} />
        <Row k="Phone Number" v={delivery.phone} />
        <Row k="Employee ID" v={delivery.employee_id} />
        <Row k="Entity" v={delivery.entity} />
          <Row k="Pincode" v={delivery.pincode} />
        <Row k="Delivery Address" v={`${delivery.address}, ${delivery.city}`} />
        <Row k="State" v={delivery.state} />
      
      </div>
      <div className="callout mt-lg">
        ⚠ Please check your phone number and delivery address carefully before submitting.
      </div>
      {error && <p className="error-text mt-lg">{error}</p>}
      <div className="btn-row mt-lg">
        <button className="btn1 btn-outline" onClick={onEdit}>Edit Details</button>
        <button className="btn1 btn-gold" onClick={onSubmit} disabled={busy}>
          {busy ? <span className="spinner" style={{ borderTopColor: 'var(--navy-900)' }} /> : 'Confirm & Submit'}
        </button>
      </div>
    </section>
  );
}

/* ---------- Step 7: Thank You ---------- */
function StepThankYou({ order, alreadyPlaced }) {
  return (
    <section className="card wf-card">
      <StepHead icon={<IconCheck />} kicker="Step 07" name={alreadyPlaced ? 'Order Already Placed' : 'Thank You!'} num="07" />
      <div className="ty-center">
        <div className="ty-badge"><IconCheck width={34} height={34} /></div>
        <p className="muted" style={{ margin: 0 }}>
          {alreadyPlaced
            ? 'This email has already been used to place an order. Only one gift order is allowed per email.'
            : 'Your gift order has been successfully submitted.'}
        </p>
      </div>
      <div className="review-list">
        <Row k="Product" v={order.gift_name} />
        <Row k="Recipient" v={order.recipient_name} />
        <Row k="Phone" v={order.phone} />
        <Row k="Delivery" v={`${order.city}, ${order.state}`} />
      </div>
      <div style={{ marginTop: 16 }}>
        <span className={`status ${order.status.toLowerCase()}`}>{order.status}</span>
      </div>
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
