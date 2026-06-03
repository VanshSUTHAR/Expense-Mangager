import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../utils/api';

const WARN_DAYS = 3; // show warning banner when EMI is within this many days

export default function EMIReminderBanner() {
  const [emis, setEmis] = useState([]);
  const location = useLocation();

  // Dismissed loan IDs for "due soon" banners — stored in sessionStorage
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('emi-banner-dismissed') || '[]'); }
    catch { return []; }
  });

  const fetchEMIs = useCallback(async () => {
    try {
      const { data } = await api.get('/loans/upcoming-emis');
      setEmis(data.emis || []);
    } catch {
      // non-critical — silently ignore
    }
  }, []);

  // Re-fetch whenever the route changes
  useEffect(() => { fetchEMIs(); }, [location.pathname, fetchEMIs]);

  // Listen for the custom event fired by Loans page after a payment
  useEffect(() => {
    window.addEventListener('emi-paid', fetchEMIs);
    return () => window.removeEventListener('emi-paid', fetchEMIs);
  }, [fetchEMIs]);

  const dismiss = (loanId) => {
    const next = [...dismissed, String(loanId)];
    setDismissed(next);
    sessionStorage.setItem('emi-banner-dismissed', JSON.stringify(next));
  };

  // Critical = Overdue or Due Today → sticky, NO close button
  const critical = emis.filter(
    e => e.status === 'Overdue' || e.status === 'Due Today'
  );

  // Warning = pending and due within WARN_DAYS and not dismissed this session
  const warning = emis.filter(
    e =>
      e.status === 'Pending' &&
      e.daysRemaining >= 1 &&
      e.daysRemaining <= WARN_DAYS &&
      !dismissed.includes(String(e.loanId))
  );

  if (critical.length === 0 && warning.length === 0) return null;

  return (
    <div className="emi-banner-stack">
      {/* ── Critical: stuck until paid ── */}
      {critical.map(emi => (
        <div key={emi.loanId} className="emi-banner emi-banner-critical">
          <span className="emi-banner-icon">
            {emi.status === 'Overdue' ? '⚠️' : '🔴'}
          </span>
          <div className="emi-banner-body">
            <span className="emi-banner-title">
              {emi.status === 'Overdue' ? 'Overdue EMI Alert!' : 'EMI Due Today!'}
            </span>
            <span className="emi-banner-detail">
              {emi.title} — ₹{Number(emi.emiAmount).toLocaleString('en-IN')}
              {emi.status === 'Overdue'
                ? ` was due on ${new Date(emi.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
                : ' must be paid today.'}
            </span>
          </div>
          <Link to="/loans" className="emi-banner-btn">Pay Now →</Link>
          {/* No ✕ button — banner stays until payment is made */}
        </div>
      ))}

      {/* ── Warning: dismissible ── */}
      {warning.map(emi => (
        <div key={emi.loanId} className="emi-banner emi-banner-warning">
          <span className="emi-banner-icon">⏰</span>
          <div className="emi-banner-body">
            <span className="emi-banner-title">EMI Due Soon!</span>
            <span className="emi-banner-detail">
              {emi.title} — ₹{Number(emi.emiAmount).toLocaleString('en-IN')} due in{' '}
              <strong>{emi.daysRemaining} day{emi.daysRemaining !== 1 ? 's' : ''}</strong>{' '}
              on {new Date(emi.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.
            </span>
          </div>
          <Link to="/loans" className="emi-banner-btn emi-banner-btn-warn">View →</Link>
          <button
            className="emi-banner-close"
            onClick={() => dismiss(emi.loanId)}
            aria-label="Dismiss"
          >✕</button>
        </div>
      ))}
    </div>
  );
}
