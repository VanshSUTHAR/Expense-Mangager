import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../utils/api";

const WARN_DAYS = 3; // show warning banner when EMI is within this many days

export default function EMIReminderBanner() {
  const [emis, setEmis] = useState([]);
  const location = useLocation();

  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("emi-banner-dismissed") || "[]");
    } catch {
      return [];
    }
  });

  const fetchEMIs = useCallback(async () => {
    try {
      const { data } = await api.get("/loans/upcoming-emis");
      setEmis(data.emis || []);
    } catch { }
  }, []);

  useEffect(() => {
    fetchEMIs();
  }, [location.pathname, fetchEMIs]);

  useEffect(() => {
    window.addEventListener("emi-paid", fetchEMIs);
    return () => window.removeEventListener("emi-paid", fetchEMIs);
  }, [fetchEMIs]);

  const dismiss = (loanId) => {
    const next = [...dismissed, String(loanId)];
    setDismissed(next);
    sessionStorage.setItem("emi-banner-dismissed", JSON.stringify(next));
  };

  const [activeIndex, setActiveIndex] = useState(0);

  const critical = emis.filter(
    (e) => e.status === "Overdue" || e.status === "Due Today",
  );

  const warning = emis.filter(
    (e) =>
      e.status === "Pending" &&
      e.daysRemaining >= 1 &&
      e.daysRemaining <= WARN_DAYS &&
      !dismissed.includes(String(e.loanId)),
  );

  const activeAlerts = [...critical, ...warning];

  const nextSlide = useCallback(() => {
    if (activeAlerts.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % activeAlerts.length);
  }, [activeAlerts.length]);

  const prevSlide = useCallback(() => {
    if (activeAlerts.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + activeAlerts.length) % activeAlerts.length);
  }, [activeAlerts.length]);

  useEffect(() => {
    if (activeIndex >= activeAlerts.length) {
      setActiveIndex(0);
    }
  }, [activeAlerts.length, activeIndex]);

  useEffect(() => {
    if (activeAlerts.length <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(timer);
  }, [activeAlerts.length, nextSlide]);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="emi-banner-slider-container">
      <div
        className="emi-banner-slider-track"
        style={{
          transform: `translateX(-${(activeIndex * 100) / activeAlerts.length}%)`,
          width: `${activeAlerts.length * 100}%`,
        }}
      >
        {activeAlerts.map((emi) => {
          const isCritical = emi.status === "Overdue" || emi.status === "Due Today";
          if (isCritical) {
            return (
              <div
                key={emi.loanId}
                className={`emi-banner ${emi.status === "Overdue"
                    ? "emi-banner-critical"
                    : "emi-banner-due-today"
                  }`}
                style={{ width: `${100 / activeAlerts.length}%` }}
              >
                <span className="emi-banner-icon"></span>
                <div className="emi-banner-body">
                  <span className="emi-banner-title">
                    {emi.status === "Overdue"
                      ? "Overdue EMI Alert!"
                      : "EMI Due Today!"}
                  </span>
                  <span className="emi-banner-detail">
                    {emi.title} — ₹{Number(emi.emiAmount).toLocaleString("en-IN")}
                    {emi.status === "Overdue"
                      ? ` was due on ${new Date(emi.nextDueDate).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}.`
                      : " must be paid today."}
                  </span>
                </div>
                <div className="emi-banner-actions">
                  <Link to={`/loans?payEMI=${emi.loanId}`} className="emi-banner-btn">
                    Pay EMI →
                  </Link>
                </div>
              </div>
            );
          } else {
            return (
              <div
                key={emi.loanId}
                className="emi-banner emi-banner-warning"
                style={{ width: `${100 / activeAlerts.length}%` }}
              >
                <span className="emi-banner-icon"></span>
                <div className="emi-banner-body">
                  <span className="emi-banner-title">EMI Due Soon!</span>
                  <span className="emi-banner-detail">
                    {emi.title} — ₹{Number(emi.emiAmount).toLocaleString("en-IN")} due
                    in{" "}
                    <strong>
                      {emi.daysRemaining} day{emi.daysRemaining !== 1 ? "s" : ""}
                    </strong>{" "}
                    on{" "}
                    {new Date(emi.nextDueDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    .
                  </span>
                </div>
                <div className="emi-banner-actions">
                  <Link
                    to={`/loans?payEMI=${emi.loanId}`}
                    className="emi-banner-btn"
                  >
                    Pay EMI →
                  </Link>
                  <button
                    className="emi-banner-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(emi.loanId);
                    }}
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          }
        })}
      </div>

      {activeAlerts.length > 1 && (
        <div className="emi-banner-controls">
          <button
            onClick={prevSlide}
            className="emi-banner-control-btn prev"
            aria-label="Previous Alert"
          >
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.5 11L1.5 6L6.5 1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="emi-banner-dots">
            {activeAlerts.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`emi-banner-dot ${idx === activeIndex ? "active" : ""}`}
                aria-label={`Go to alert ${idx + 1}`}
              />
            ))}
          </div>
          <button
            onClick={nextSlide}
            className="emi-banner-control-btn next"
            aria-label="Next Alert"
          >
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.5 11L6.5 6L1.5 1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}