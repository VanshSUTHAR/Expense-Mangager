import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import api from "../utils/api";
import toast from "react-hot-toast";
import {
  FaCar,
  FaHome,
  FaBriefcase,
  FaCheckCircle,
  FaUniversity,
  FaCalculator,
  FaPlus,
  FaEdit,
  FaWallet,
} from "react-icons/fa";
import { MdSchool } from "react-icons/md";
import { GiTakeMyMoney, GiPartyPopper } from "react-icons/gi";
import { IoClose } from "react-icons/io5";
import "./Loans.css";

const LOW_BALANCE_THRESHOLD = 5000;

const CATEGORY_ICONS = {
  car: <FaCar />,
  home: <FaHome />,
  personal: <FaBriefcase />,
  education: <MdSchool />,
  other: <GiTakeMyMoney />,
};

const calculateEMI = (principal, rate, years) => {
  const r = rate / 12 / 100;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

const getLoanEMI = (loan) => {
  const custom = Number(loan.customEMI) || 0;
  return custom > 0
    ? custom
    : calculateEMI(loan.principalAmount, loan.interestRate, loan.tenureYears);
};

const getEMIDueInfo = (loan) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = loan.emiDueDay || 5;
  const lastPaid = loan.lastEMIPaidAt ? new Date(loan.lastEMIPaidAt) : null;
  const currentMonthPaid =
    lastPaid &&
    lastPaid.getMonth() === today.getMonth() &&
    lastPaid.getFullYear() === today.getFullYear();

  let nextDueDate;
  if (currentMonthPaid) {
    nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  } else {
    nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
  }

  const daysRemaining = Math.floor(
    (nextDueDate - today) / (1000 * 60 * 60 * 24)
  );

  let status;
  if (currentMonthPaid) status = "Paid";
  else if (daysRemaining < 0) status = "Overdue";
  else if (daysRemaining === 0) status = "Due Today";
  else status = "Pending";

  return { nextDueDate, daysRemaining, status };
};

// ─── Pay EMI Modal ────────────────────────────────────────────────────────────

function PayEMIModal({ loan, bankAccounts, debitCards, onClose, onSuccess }) {
  const emiAmount = Math.round(getLoanEMI(loan));
  const { nextDueDate, status: dueStatus } = getEMIDueInfo(loan);

  const [selectedType, setSelectedType] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [paying, setPaying] = useState(false);

  const selectedAccount =
    selectedType === "bank"
      ? bankAccounts.find((b) => b._id === selectedId)
      : debitCards.find((c) => c._id === selectedId);

  const availableBalance =
    selectedType === "bank"
      ? (selectedAccount?.balance ?? null)
      : (selectedAccount?.linkedBankAccount?.balance ?? null);

  const bankName =
    selectedType === "bank"
      ? selectedAccount?.bankName
      : selectedAccount?.linkedBankAccount?.bankName;

  const remainingAfter =
    availableBalance !== null ? availableBalance - emiAmount : null;

  const isInsufficient =
    availableBalance !== null && emiAmount > availableBalance;

  const isLowAfter =
    remainingAfter !== null &&
    remainingAfter >= 0 &&
    remainingAfter < LOW_BALANCE_THRESHOLD;

  // ✅ Only show preview when balance is sufficient
  const showPreview = availableBalance !== null && !isInsufficient;

  const handleSourceChange = (e) => {
    const [type, id] = e.target.value.split("|");
    setSelectedType(type);
    setSelectedId(id);
  };

  const handlePay = async () => {
    if (!selectedId) {
      toast.error("Please select a payment account.");
      return;
    }
    if (isInsufficient) {
      toast.error(
        `Insufficient Balance for this EMI payment. Account has only ₹${Number(availableBalance).toLocaleString("en-IN")}.`
      );
      return;
    }

    setPaying(true);
    try {
      const payload =
        selectedType === "bank"
          ? { bankAccountId: selectedId }
          : { debitCardId: selectedId };

      await api.post(`/loans/${loan._id}/pay-emi`, payload);

      toast.success(
        `EMI of ₹${emiAmount.toLocaleString("en-IN")} paid from ${bankName}!`,
        { style: { background: "#ecfdf5", color: "#065f46" } }
      );

      if (isLowAfter) {
        setTimeout(() => {
          toast(
            `Low Balance Warning: Only ₹${remainingAfter.toLocaleString("en-IN")} remaining in ${bankName}.`,
            { style: { background: "#fff7ed", color: "#92400e" }, icon: "⚠️" }
          );
        }, 800);
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "EMI payment failed.", {
        style: { background: "#fef2f2", color: "#991b1b" },
      });
    } finally {
      setPaying(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay loan-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal fade-in emi-pay-modal">
        <div className="modal-header">
          <h3>Pay EMI — {loan.title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* EMI Info Grid */}
        <div className="emi-info-grid">
          <div className="emi-info-item">
            <span>EMI Amount</span>
            <strong className="emi-info-amount">
              ₹{emiAmount.toLocaleString("en-IN")}
            </strong>
          </div>
          <div className="emi-info-item">
            <span>Due Date</span>
            <strong>
              {nextDueDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </strong>
          </div>
          <div className="emi-info-item">
            <span>Status</span>
            <span className={`emi-due-badge emi-due-${dueStatus.toLowerCase().replace(" ", "-")}`}>
              {dueStatus}
            </span>
          </div>
          <div className="emi-info-item">
            <span>Progress</span>
            <strong>{loan.paidEMIs}/{loan.tenureYears * 12} EMIs</strong>
          </div>
        </div>

        {/* Account selector */}
        <div className="form-group" style={{ marginTop: 16 }}>
          <label>Pay From</label>
          <select
            className="input"
            value={selectedType && selectedId ? `${selectedType}|${selectedId}` : ""}
            onChange={handleSourceChange}
          >
            <option value="">— Select Account / Debit Card —</option>
            {bankAccounts.length > 0 && (
              <optgroup label="Bank Accounts">
                {bankAccounts.map((b) => (
                  <option key={b._id} value={`bank|${b._id}`}>
                    {b.bankName} ••••{b.accountNumber.slice(-4)} — Balance: ₹
                    {Number(b.balance).toLocaleString("en-IN")}
                  </option>
                ))}
              </optgroup>
            )}
            {debitCards.length > 0 && (
              <optgroup label="Debit Cards">
                {debitCards.map((c) => (
                  <option key={c._id} value={`debit|${c._id}`}>
                    {c.cardName} ••••{c.cardNumber.slice(-4)} →{" "}
                    {c.linkedBankAccount?.bankName} — Balance: ₹
                    {Number(c.linkedBankAccount?.balance || 0).toLocaleString("en-IN")}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Insufficient warning — only when balance < EMI */}
        {isInsufficient && availableBalance !== null && (
          <div className="emi-insufficient-warning">
            ⚠️ Insufficient Balance — Your account has only ₹{Number(availableBalance).toLocaleString("en-IN")}. You cannot make this payment.
          </div>
        )}

        {/* Balance Preview — only when sufficient */}
        {showPreview && (
          <div className={`emi-balance-preview ${isLowAfter ? "preview-warning" : "preview-ok"}`}>
            <div className="emi-preview-row">
              <span>Current Balance</span>
              <strong>₹{Number(availableBalance).toLocaleString("en-IN")}</strong>
            </div>
            <div className="emi-preview-row">
              <span>EMI Amount</span>
              <strong style={{ color: "#dc2626" }}>
                − ₹{emiAmount.toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="emi-preview-divider" />
            <div className="emi-preview-row emi-preview-result">
              <span>Remaining Balance</span>
              <strong style={{ color: "#047857" }}>
                ₹{remainingAfter.toLocaleString("en-IN")}
              </strong>
            </div>
            {isLowAfter && (
              <div className="emi-alert emi-alert-warning">
                Low Balance Warning: Only ₹{remainingAfter.toLocaleString("en-IN")} remaining after this payment.
              </div>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handlePay}
            disabled={paying || isInsufficient || !selectedId}
          >
            {paying ? "Processing..." : `Pay ₹${emiAmount.toLocaleString("en-IN")}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Advance Payment Modal ────────────────────────────────────────────────────

function AdvancePaymentModal({ loan, bankAccounts, debitCards, onClose, onSuccess }) {
  const emiAmount = Math.round(getLoanEMI(loan));
  const totalEMIs = loan.tenureYears * 12;
  const effectivePaid =
    loan.paidEMIs + Math.floor((loan.advancePaidAmount || 0) / emiAmount);
  const remainingEMIs = totalEMIs - effectivePaid;
  const outstandingBalance =
    totalEMIs * emiAmount -
    loan.paidEMIs * emiAmount -
    (loan.advancePaidAmount || 0);

  const [amount, setAmount] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [paying, setPaying] = useState(false);

  const selectedAccount =
    selectedType === "bank"
      ? bankAccounts.find((b) => b._id === selectedId)
      : debitCards.find((c) => c._id === selectedId);

  const availableBalance =
    selectedType === "bank"
      ? (selectedAccount?.balance ?? null)
      : (selectedAccount?.linkedBankAccount?.balance ?? null);

  const bankName =
    selectedType === "bank"
      ? selectedAccount?.bankName
      : selectedAccount?.linkedBankAccount?.bankName;

  const payAmount = Number(amount) || 0;
  const remainingAfter =
    availableBalance !== null ? availableBalance - payAmount : null;
  const isInsufficient =
    availableBalance !== null && payAmount > 0 && payAmount > availableBalance;
  const isExceedsLoan = payAmount > outstandingBalance;
  const isFullPayoff = payAmount === outstandingBalance;
  const isLowAfter =
    remainingAfter !== null &&
    remainingAfter >= 0 &&
    remainingAfter < LOW_BALANCE_THRESHOLD;

  const emisCovered =
    payAmount > 0
      ? Math.floor(((loan.advancePaidAmount || 0) + payAmount) / emiAmount)
      : 0;
  const newEffectivePaid = loan.paidEMIs + emisCovered;

  // ✅ Only show preview when balance is sufficient
  const showPreview =
    availableBalance !== null && payAmount > 0 && !isExceedsLoan && !isInsufficient;

  const canPay =
    payAmount > 0 && !isExceedsLoan && !isInsufficient && !!selectedId;

  const handleSourceChange = (e) => {
    const [type, id] = e.target.value.split("|");
    setSelectedType(type);
    setSelectedId(id);
  };

  const handlePay = async () => {
    if (!canPay) return;
    setPaying(true);
    try {
      const payload = {
        amount: payAmount,
        ...(selectedType === "bank"
          ? { bankAccountId: selectedId }
          : { debitCardId: selectedId }),
      };

      await api.post(`/loans/${loan._id}/advance-payment`, payload);

      toast.success(
        isFullPayoff
          ? `Loan fully paid off from ${bankName}! 🎉`
          : `Prepayment of ₹${payAmount.toLocaleString("en-IN")} made from ${bankName}.`,
        { style: { background: "#ecfdf5", color: "#065f46" }, duration: 5000 }
      );

      if (isLowAfter) {
        setTimeout(
          () =>
            toast(
              `Low Balance Warning: Only ₹${remainingAfter.toLocaleString("en-IN")} remaining in ${bankName}.`,
              { style: { background: "#fff7ed", color: "#92400e" }, icon: "⚠️" }
            ),
          800
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Advance payment failed.", {
        style: { background: "#fef2f2", color: "#991b1b" },
      });
    } finally {
      setPaying(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay loan-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal fade-in emi-pay-modal">
        <div className="modal-header">
          <h3>Prepayment — {loan.title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Outstanding balance hero */}
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          borderRadius: 10, padding: "14px 18px", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
              Outstanding Balance
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#065f46", marginTop: 2 }}>
              ₹{outstandingBalance.toLocaleString("en-IN")}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{remainingEMIs} EMIs left</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              ₹{emiAmount.toLocaleString("en-IN")} / month
            </div>
          </div>
        </div>

        {/* Amount input */}
        <div className="form-group">
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 6,
          }}>
            <label style={{ margin: 0 }}>Prepayment Amount (₹)</label>
            <button
              type="button"
              onClick={() => setAmount(String(outstandingBalance))}
              style={{
                fontSize: 12, color: "#059669", background: "#ecfdf5",
                border: "1px solid #6ee7b7", borderRadius: 6,
                padding: "3px 10px", cursor: "pointer", fontWeight: 600,
              }}
            >
              Pay Full Balance
            </button>
          </div>
          <input
            className="input"
            type="number"
            min="1"
            placeholder={`Enter amount (max ₹${outstandingBalance.toLocaleString("en-IN")})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={isExceedsLoan ? { borderColor: "#dc2626" } : {}}
          />
          {payAmount > 0 && !isExceedsLoan && newEffectivePaid < totalEMIs && (
            <div style={{ marginTop: 6, fontSize: 13, color: "#059669", fontWeight: 500 }}>
              After this payment:{" "}
              <strong>
                {totalEMIs - newEffectivePaid} EMI{totalEMIs - newEffectivePaid !== 1 ? "s" : ""}
              </strong>{" "}
              remaining.
            </div>
          )}
          {isFullPayoff && (
            <div style={{ marginTop: 6, fontSize: 13, color: "#059669", fontWeight: 600 }}>
              This will fully close your loan.
            </div>
          )}
        </div>

        {/* Account selector */}
        <div className="form-group">
          <label>Pay From</label>
          <select
            className="input"
            value={selectedType && selectedId ? `${selectedType}|${selectedId}` : ""}
            onChange={handleSourceChange}
          >
            <option value="">— Select Account / Debit Card —</option>
            {bankAccounts.length > 0 && (
              <optgroup label="Bank Accounts">
                {bankAccounts.map((b) => (
                  <option key={b._id} value={`bank|${b._id}`}>
                    {b.bankName} ••••{b.accountNumber.slice(-4)} — ₹
                    {Number(b.balance).toLocaleString("en-IN")}
                  </option>
                ))}
              </optgroup>
            )}
            {debitCards.length > 0 && (
              <optgroup label="Debit Cards">
                {debitCards.map((c) => (
                  <option key={c._id} value={`debit|${c._id}`}>
                    {c.cardName} ••••{c.cardNumber.slice(-4)} →{" "}
                    {c.linkedBankAccount?.bankName} — ₹
                    {Number(c.linkedBankAccount?.balance || 0).toLocaleString("en-IN")}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Insufficient warning — only when amount entered and balance is low */}
        {isInsufficient && availableBalance !== null && (
          <div className="emi-insufficient-warning">
            ⚠️ Insufficient Balance — Your account has only ₹{Number(availableBalance).toLocaleString("en-IN")}. You cannot make this payment.
          </div>
        )}

        {/* Balance Preview — only when sufficient */}
        {showPreview && (
          <div className={`emi-balance-preview ${isLowAfter ? "preview-warning" : "preview-ok"}`}>
            <div className="emi-preview-row">
              <span>Account Balance</span>
              <strong>₹{Number(availableBalance).toLocaleString("en-IN")}</strong>
            </div>
            <div className="emi-preview-row">
              <span>Prepayment</span>
              <strong style={{ color: "#dc2626" }}>
                − ₹{payAmount.toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="emi-preview-divider" />
            <div className="emi-preview-row emi-preview-result">
              <span>Remaining Balance</span>
              <strong style={{ color: "#047857" }}>
                ₹{remainingAfter.toLocaleString("en-IN")}
              </strong>
            </div>
            {isLowAfter && (
              <div className="emi-alert emi-alert-warning">
                Low Balance Warning: Only ₹{remainingAfter.toLocaleString("en-IN")} remaining after this payment.
              </div>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {canPay && (
            <button className="btn btn-primary" onClick={handlePay} disabled={paying}>
              {paying
                ? "Processing..."
                : isFullPayoff
                  ? "Close Loan — ₹" + outstandingBalance.toLocaleString("en-IN")
                  : `Pay ₹${payAmount.toLocaleString("en-IN")}`}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Close Loan Modal ─────────────────────────────────────────────────────────

function CloseLoanModal({ loan, bankAccounts, debitCards, onClose, onSuccess }) {
  const emiAmount = Math.round(getLoanEMI(loan));
  const totalEMIs = loan.tenureYears * 12;
  const totalPayable = emiAmount * totalEMIs;
  const paidAmount = loan.paidEMIs * emiAmount + (loan.advancePaidAmount || 0);
  const outstandingBalance = Math.max(0, totalPayable - paidAmount);

  const [selectedType, setSelectedType] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [closing, setClosing] = useState(false);

  const selectedAccount =
    selectedType === "bank"
      ? bankAccounts.find((b) => b._id === selectedId)
      : debitCards.find((c) => c._id === selectedId);

  const availableBalance =
    selectedType === "bank"
      ? (selectedAccount?.balance ?? null)
      : (selectedAccount?.linkedBankAccount?.balance ?? null);

  const bankName =
    selectedType === "bank"
      ? selectedAccount?.bankName
      : selectedAccount?.linkedBankAccount?.bankName;

  const remainingAfter =
    availableBalance !== null ? availableBalance - outstandingBalance : null;
  const isInsufficient =
    availableBalance !== null && outstandingBalance > availableBalance;
  const isLowAfter =
    remainingAfter !== null &&
    remainingAfter >= 0 &&
    remainingAfter < LOW_BALANCE_THRESHOLD;

  // ✅ Only show preview when balance is sufficient
  const showPreview = availableBalance !== null && !isInsufficient;

  const canClose = outstandingBalance > 0 && selectedId && !isInsufficient;

  const handleSourceChange = (e) => {
    const [type, id] = e.target.value.split("|");
    setSelectedType(type);
    setSelectedId(id);
  };

  const handleCloseLoan = async () => {
    if (!selectedId) {
      toast.error("Please select a bank account or debit card.");
      return;
    }
    if (isInsufficient) {
      toast.error(
        `Insufficient Balance. Account has only ₹${Number(availableBalance).toLocaleString("en-IN")}.`
      );
      return;
    }
    setClosing(true);
    try {
      const payload = {
        amount: outstandingBalance,
        ...(selectedType === "bank"
          ? { bankAccountId: selectedId }
          : { debitCardId: selectedId }),
      };

      await api.post(`/loans/${loan._id}/advance-payment`, payload);

      toast.success(`Loan closed successfully from ${bankName}!`, {
        style: { background: "#ecfdf5", color: "#065f46" },
        duration: 5000,
      });

      if (isLowAfter) {
        setTimeout(() => {
          toast(
            `Low Balance Warning: Only ₹${remainingAfter.toLocaleString("en-IN")} remaining in ${bankName}.`,
            { style: { background: "#fff7ed", color: "#92400e" }, icon: "⚠️" }
          );
        }, 800);
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Loan close failed.", {
        style: { background: "#fef2f2", color: "#991b1b" },
      });
    } finally {
      setClosing(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay loan-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal fade-in emi-pay-modal">
        <div className="modal-header">
          <h3>Close Loan — {loan.title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          borderRadius: 10, padding: "14px 18px", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
              Amount Needed To Close
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#065f46", marginTop: 2 }}>
              ₹{outstandingBalance.toLocaleString("en-IN")}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {loan.paidEMIs}/{totalEMIs} EMIs paid
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              ₹{emiAmount.toLocaleString("en-IN")} / month
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Close Loan From</label>
          <select
            className="input"
            value={selectedType && selectedId ? `${selectedType}|${selectedId}` : ""}
            onChange={handleSourceChange}
          >
            <option value="">— Select Account / Debit Card —</option>
            {bankAccounts.length > 0 && (
              <optgroup label="Bank Accounts">
                {bankAccounts.map((b) => (
                  <option key={b._id} value={`bank|${b._id}`}>
                    {b.bankName} ••••{b.accountNumber.slice(-4)} — Balance: ₹
                    {Number(b.balance).toLocaleString("en-IN")}
                  </option>
                ))}
              </optgroup>
            )}
            {debitCards.length > 0 && (
              <optgroup label="Debit Cards">
                {debitCards.map((c) => (
                  <option key={c._id} value={`debit|${c._id}`}>
                    {c.cardName} ••••{c.cardNumber.slice(-4)} →{" "}
                    {c.linkedBankAccount?.bankName} — Balance: ₹
                    {Number(c.linkedBankAccount?.balance || 0).toLocaleString("en-IN")}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Insufficient warning — only when balance < required amount */}
        {isInsufficient && availableBalance !== null && (
          <div className="emi-insufficient-warning">
            ⚠️ Insufficient Balance — Your account has only ₹{Number(availableBalance).toLocaleString("en-IN")}. You cannot close this loan.
          </div>
        )}

        {/* Balance Preview — only when sufficient */}
        {showPreview && (
          <div className={`emi-balance-preview ${isLowAfter ? "preview-warning" : "preview-ok"}`}>
            <div className="emi-preview-row">
              <span>Current Balance</span>
              <strong>₹{Number(availableBalance).toLocaleString("en-IN")}</strong>
            </div>
            <div className="emi-preview-row">
              <span>Loan Closing Amount</span>
              <strong style={{ color: "#dc2626" }}>
                − ₹{outstandingBalance.toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="emi-preview-divider" />
            <div className="emi-preview-row emi-preview-result">
              <span>Remaining Balance</span>
              <strong style={{ color: "#047857" }}>
                ₹{Math.max(0, remainingAfter).toLocaleString("en-IN")}
              </strong>
            </div>
            {isLowAfter && (
              <div className="emi-alert emi-alert-warning">
                Low Balance Warning: Only ₹{remainingAfter.toLocaleString("en-IN")} remaining after closing this loan.
              </div>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleCloseLoan}
            disabled={closing || !canClose}
          >
            {closing
              ? "Closing..."
              : `Close Loan — ₹${outstandingBalance.toLocaleString("en-IN")}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Loans Page ──────────────────────────────────────────────────────────

export default function Loans() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [showCalc, setShowCalc] = useState(false);
  const [customEMI, setCustomEMI] = useState("");
  const [editEMI, setEditEMI] = useState(false);
  const [payEMITarget, setPayEMITarget] = useState(null);
  const [advancePaymentTarget, setAdvancePaymentTarget] = useState(null);
  const [closeLoanTarget, setCloseLoanTarget] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [debitCards, setDebitCards] = useState([]);
  const [selectedBankFilter, setSelectedBankFilter] = useState("");

  const [calc, setCalc] = useState({ amount: "", rate: "", years: "" });
  const [form, setForm] = useState({
    title: "",
    category: "car",
    principalAmount: "",
    interestRate: "",
    tenureYears: "",
    startDate: new Date().toISOString().split("T")[0],
    emiDueDay: "5",
    notes: "",
    bankName: "",
    accountNumber: "",
    paidEMIs: "",
  });

  const previewEMI =
    form.principalAmount && form.interestRate && form.tenureYears
      ? Number(customEMI) ||
      Math.round(
        calculateEMI(
          Number(form.principalAmount),
          Number(form.interestRate),
          Number(form.tenureYears)
        )
      )
      : 0;

  const previewTotalPayable = previewEMI * Number(form.tenureYears || 0) * 12;
  const previewTotalInterest = previewTotalPayable - Number(form.principalAmount || 0);

  useEffect(() => {
    fetchLoans();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (loans.length > 0) {
      const payEMIId = searchParams.get("payEMI");
      if (payEMIId) {
        const target = loans.find(l => String(l._id) === payEMIId);
        if (target) {
          setPayEMITarget(target);
          searchParams.delete("payEMI");
          setSearchParams(searchParams, { replace: true });
        }
      }
    }
  }, [loans, searchParams, setSearchParams]);

  const fetchLoans = async () => {
    try {
      const { data } = await api.get("/loans");
      setLoans(data.loans);
    } catch {
      toast.error("Failed to fetch loans");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const [bankRes, debitRes] = await Promise.all([
        api.get("/bank-accounts"),
        api.get("/debit-cards"),
      ]);
      setBankAccounts(bankRes.data.accounts || []);
      setDebitCards(debitRes.data.cards || []);
    } catch {
      // non-critical
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const totalFormEMIs = (Number(form.tenureYears) || 0) * 12;
      const paidEMIsValue = Math.min(
        Number(form.paidEMIs) || 0,
        totalFormEMIs || Number(form.paidEMIs) || 0
      );

      const payload = {
        title: form.title,
        category: form.category,
        principalAmount: Number(form.principalAmount) || 0,
        interestRate: Number(form.interestRate) || 0,
        tenureYears: Number(form.tenureYears) || 0,
        customEMI: Number(customEMI) || 0,
        startDate: form.startDate,
        emiDueDay: Number(form.emiDueDay) || 5,
        notes: form.notes,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        paidEMIs: paidEMIsValue,
      };

      if (editingLoanId) {
        const res = await api.put(`/loans/${editingLoanId}`, payload);
        setLoans((prev) =>
          prev.map((l) =>
            l._id === editingLoanId
              ? { ...l, ...(res.data?.loan || res.data) }
              : l
          )
        );
        toast.success("Loan updated!");
        setEditingLoanId(null);
      } else {
        const res = await api.post("/loans", payload);
        setLoans((prev) => [res.data?.loan || res.data, ...prev]);
        toast.success("Loan added!");
      }

      setShowModal(false);
      resetForm();
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving loan");
    }
  };

  const handleEditLoan = (loan) => {
    setForm({
      title: loan.title || "",
      category: loan.category || "car",
      principalAmount: loan.principalAmount || "",
      interestRate: loan.interestRate || "",
      tenureYears: loan.tenureYears || "",
      startDate: loan.startDate
        ? loan.startDate.split("T")[0]
        : new Date().toISOString().split("T")[0],
      emiDueDay: loan.emiDueDay || "5",
      notes: loan.notes || "",
      bankName: loan.bankName || "",
      accountNumber: loan.accountNumber || "",
      paidEMIs: loan.paidEMIs || 0,
    });
    setEditingLoanId(loan._id);
    setCustomEMI(loan.customEMI || "");
    setEditEMI(false);
    setShowModal(true);
  };

  const resetForm = () => {
    setCustomEMI("");
    setEditEMI(false);
    setForm({
      title: "",
      category: "car",
      principalAmount: "",
      interestRate: "",
      tenureYears: "",
      startDate: new Date().toISOString().split("T")[0],
      emiDueDay: "5",
      notes: "",
      bankName: "",
      accountNumber: "",
      paidEMIs: "",
    });
  };

  const calcEMI =
    calc.amount && calc.rate && calc.years
      ? calculateEMI(Number(calc.amount), Number(calc.rate), Number(calc.years))
      : 0;
  const calcTotal = calcEMI * Number(calc.years) * 12;
  const calcInterest = calcTotal - Number(calc.amount);

  const allActive = loans.filter((l) => l.status === "active");
  const allCompleted = loans.filter((l) => l.status === "completed");

  const activeLoans = selectedBankFilter
    ? allActive.filter((l) => l.bankName === selectedBankFilter)
    : allActive;
  const completedLoans = selectedBankFilter
    ? allCompleted.filter((l) => l.bankName === selectedBankFilter)
    : allCompleted;

  const totalDebt = activeLoans.reduce((s, l) => s + l.principalAmount, 0);
  const totalEMIPerMonth = activeLoans.reduce((s, l) => s + getLoanEMI(l), 0);

  const savedBanks = JSON.parse(localStorage.getItem("banks")) || [];
  const allBankNames = [
    ...bankAccounts.map((b) => ({
      bankName: b.bankName,
      accountNumber: b.accountNumber,
    })),
    ...savedBanks.filter(
      (sb) => !bankAccounts.some((b) => b.bankName === sb.bankName)
    ),
  ];

  return (
    <div className="loans-page fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaUniversity size={30} /> Loans
          </h1>
          <p className="page-sub">Manage your loans & EMIs</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowCalc(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <FaCalculator size={16} /> EMI Calculator
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowModal(true);
              setEditingLoanId(null);
              resetForm();
            }}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <FaPlus size={14} /> Add Loan
          </button>
        </div>
      </div>

      <div className="loan-summary">
        <div className="loan-sum-card">
          <div className="sum-label">Total Debt</div>
          <div className="sum-value" style={{ color: "#dc2626" }}>
            ₹{totalDebt.toLocaleString()}
          </div>
        </div>
        <div className="loan-sum-card">
          <div className="sum-label">Active Loans</div>
          <div className="sum-value">{activeLoans.length}</div>
        </div>
        <div className="loan-sum-card">
          <div className="sum-label">Monthly EMI Total</div>
          <div className="sum-value" style={{ color: "#d97706" }}>
            ₹{Math.round(totalEMIPerMonth).toLocaleString()}
          </div>
        </div>
        <div className="loan-sum-card">
          <div className="sum-label">Loans Completed</div>
          <div className="sum-value" style={{ color: "#059669" }}>
            {allCompleted.length}
          </div>
        </div>
      </div>

      <div className="loans-bank-filter">
        <label className="bank-filter-label">
          <FaUniversity size={14} /> Filter by Bank
        </label>
        <select
          className="input bank-filter-select"
          value={selectedBankFilter}
          onChange={(e) => setSelectedBankFilter(e.target.value)}
        >
          <option value="">All Banks</option>
          {allBankNames.map((bank, i) => (
            <option key={i} value={bank.bankName}>
              {bank.bankName} — ••••{bank.accountNumber.slice(-4)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="empty-state"><span className="loading" /></div>
      ) : activeLoans.length === 0 && completedLoans.length === 0 ? (
        <div className="loans-empty">
          <div style={{ fontSize: 52, marginBottom: 14 }}>🏦</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1b2559" }}>No loans yet</div>
          <div style={{ fontSize: 13, color: "#7a86b6", marginTop: 6 }}>
            Add your first loan to track EMIs
          </div>
        </div>
      ) : (
        <>
          {activeLoans.length > 0 && (
            <>
              <h2 className="section-title">Active Loans</h2>
              <div className="loans-grid">
                {activeLoans.map((loan) => (
                  <LoanCard
                    key={loan._id}
                    loan={loan}
                    onPayEMI={() => setPayEMITarget(loan)}
                    onAdvancePayment={() => setAdvancePaymentTarget(loan)}
                    onCloseLoan={() => setCloseLoanTarget(loan)}
                    onEdit={handleEditLoan}
                  />
                ))}
              </div>
            </>
          )}
          {completedLoans.length > 0 && (
            <>
              <h2
                className="section-title"
                style={{ marginTop: 28, display: "flex", alignItems: "center", gap: "8px" }}
              >
                <FaCheckCircle size={22} /> Completed
              </h2>
              <div className="loans-grid">
                {completedLoans.map((loan) => (
                  <LoanCard
                    key={loan._id}
                    loan={loan}
                    onPayEMI={() => { }}
                    onEdit={handleEditLoan}
                    completed
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Pay EMI Modal */}
      {payEMITarget && (
        <PayEMIModal
          loan={payEMITarget}
          bankAccounts={bankAccounts}
          debitCards={debitCards}
          onClose={() => setPayEMITarget(null)}
          onSuccess={() => {
            fetchLoans();
            fetchAccounts();
            window.dispatchEvent(new Event("emi-paid"));
          }}
        />
      )}

      {/* Advance Payment Modal */}
      {advancePaymentTarget && (
        <AdvancePaymentModal
          loan={advancePaymentTarget}
          bankAccounts={bankAccounts}
          debitCards={debitCards}
          onClose={() => setAdvancePaymentTarget(null)}
          onSuccess={() => {
            fetchLoans();
            fetchAccounts();
            window.dispatchEvent(new Event("emi-paid"));
          }}
        />
      )}

      {/* Close Loan Modal */}
      {closeLoanTarget && (
        <CloseLoanModal
          loan={closeLoanTarget}
          bankAccounts={bankAccounts}
          debitCards={debitCards}
          onClose={() => setCloseLoanTarget(null)}
          onSuccess={() => {
            fetchLoans();
            fetchAccounts();
            window.dispatchEvent(new Event("emi-paid"));
          }}
        />
      )}

      {/* Add / Edit Loan Modal */}
      {showModal &&
        createPortal(
          <div
            className="modal-overlay loan-modal-overlay"
            onClick={(e) =>
              e.target === e.currentTarget &&
              (setShowModal(false), setEditingLoanId(null), resetForm())
            }
          >
            <div className="modal fade-in loan-edit-modal">
              <div className="modal-header">
                <h3>{editingLoanId ? "Edit Loan" : "Add New Loan"}</h3>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowModal(false);
                    setEditingLoanId(null);
                    resetForm();
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {editingLoanId ? (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Loan Amount (₹)</label>
                        <input
                          className="input"
                          type="number"
                          placeholder="e.g. 800000"
                          value={form.principalAmount}
                          onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Paid EMIs</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max={Number(form.tenureYears || 0) * 12}
                          placeholder="e.g. 5"
                          value={form.paidEMIs}
                          onChange={(e) => setForm({ ...form, paidEMIs: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Linked Bank Account</label>
                      <select
                        className="input"
                        value={form.bankName}
                        onChange={(e) => {
                          const acc = bankAccounts.find((b) => b.bankName === e.target.value);
                          setForm({
                            ...form,
                            bankName: acc?.bankName || e.target.value,
                            accountNumber: acc?.accountNumber || "",
                          });
                        }}
                      >
                        <option value="">Select Bank</option>
                        {bankAccounts.map((b) => (
                          <option key={b._id} value={b.bankName}>
                            {b.bankName} — ••••{b.accountNumber.slice(-4)} (₹
                            {Number(b.balance).toLocaleString("en-IN")})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Loan Title</label>
                      <input
                        className="input"
                        placeholder="e.g. Car Loan - Maruti Swift"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Category</label>
                        <select
                          className="input"
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                        >
                          <option value="car">Car</option>
                          <option value="home">Home</option>
                          <option value="personal">Personal</option>
                          <option value="education">Education</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Start Date</label>
                        <input
                          className="input"
                          type="date"
                          value={form.startDate}
                          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Loan Amount (₹)</label>
                        <input
                          className="input"
                          type="number"
                          placeholder="e.g. 800000"
                          value={form.principalAmount}
                          onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Interest Rate (% / year)</label>
                        <input
                          className="input"
                          type="number"
                          step="0.1"
                          placeholder="e.g. 10.5"
                          value={form.interestRate}
                          onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Tenure (Years)</label>
                        <input
                          className="input"
                          type="number"
                          placeholder="e.g. 5"
                          value={form.tenureYears}
                          onChange={(e) => setForm({ ...form, tenureYears: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>EMI Due Day (1–28)</label>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          max="28"
                          placeholder="e.g. 5"
                          value={form.emiDueDay}
                          onChange={(e) => setForm({ ...form, emiDueDay: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Linked Bank Account</label>
                      <select
                        className="input"
                        value={form.bankName}
                        onChange={(e) => {
                          const acc = bankAccounts.find((b) => b.bankName === e.target.value);
                          setForm({
                            ...form,
                            bankName: acc?.bankName || e.target.value,
                            accountNumber: acc?.accountNumber || "",
                          });
                        }}
                      >
                        <option value="">Select Bank</option>
                        {bankAccounts.map((b) => (
                          <option key={b._id} value={b.bankName}>
                            {b.bankName} — ••••{b.accountNumber.slice(-4)} (₹
                            {Number(b.balance).toLocaleString("en-IN")})
                          </option>
                        ))}
                      </select>
                    </div>

                    {form.principalAmount && form.interestRate && form.tenureYears && (
                      <div className="loan-preview">
                        <div className="preview-item">
                          <span>Monthly EMI</span>
                          {!editEMI ? (
                            <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              ₹{previewEMI.toLocaleString()}
                              <FaEdit
                                style={{ cursor: "pointer", color: "#6b7280", fontSize: "14px" }}
                                onClick={() => setEditEMI(true)}
                              />
                            </strong>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <input
                                type="number"
                                className="input"
                                value={customEMI}
                                placeholder={Math.round(
                                  calculateEMI(
                                    Number(form.principalAmount),
                                    Number(form.interestRate),
                                    Number(form.tenureYears)
                                  )
                                )}
                                onChange={(e) => setCustomEMI(e.target.value)}
                                style={{ width: "140px", height: "36px", padding: "6px 10px" }}
                              />
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setEditEMI(false)}
                              >
                                Save
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="preview-item">
                          <span>Total Payable</span>
                          <strong>₹{Math.round(previewTotalPayable).toLocaleString()}</strong>
                        </div>
                        <div className="preview-item">
                          <span>Total Interest</span>
                          <strong style={{ color: "#dc2626" }}>
                            ₹{Math.round(previewTotalInterest).toLocaleString()}
                          </strong>
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Notes</label>
                      <input
                        className="input"
                        placeholder="Optional..."
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      setEditingLoanId(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingLoanId ? "Save Amount, EMIs & Bank" : "➕ Add Loan"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* EMI Calculator */}
      {showCalc &&
        createPortal(
          <div
            className="modal-overlay loan-modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setShowCalc(false)}
          >
            <div className="modal fade-in loan-calc-modal">
              <div className="modal-header">
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaCalculator size={20} /> EMI Calculator
                </h3>
                <button className="modal-close" onClick={() => setShowCalc(false)}>
                  <IoClose size={24} />
                </button>
              </div>

              <div className="form-group">
                <label>Loan Amount (₹)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 800000"
                  value={calc.amount}
                  onChange={(e) => setCalc({ ...calc, amount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Interest Rate (% per year)</label>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 10.5"
                  value={calc.rate}
                  onChange={(e) => setCalc({ ...calc, rate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Tenure (Years)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 5"
                  value={calc.years}
                  onChange={(e) => setCalc({ ...calc, years: e.target.value })}
                />
              </div>

              {calcEMI > 0 && (
                <div className="calc-result">
                  <div className="calc-row">
                    <span>Monthly EMI</span>
                    <strong className="calc-emi">₹{Math.round(calcEMI).toLocaleString()}</strong>
                  </div>
                  <div className="calc-row">
                    <span>Total Amount Payable</span>
                    <strong>₹{Math.round(calcTotal).toLocaleString()}</strong>
                  </div>
                  <div className="calc-row">
                    <span>Principal Amount</span>
                    <strong style={{ color: "#059669" }}>
                      ₹{Number(calc.amount).toLocaleString()}
                    </strong>
                  </div>
                  <div className="calc-row">
                    <span>Total Interest</span>
                    <strong style={{ color: "#dc2626" }}>
                      ₹{Math.round(calcInterest).toLocaleString()}
                    </strong>
                  </div>
                  <div className="interest-bar-wrap">
                    <div className="interest-bar-label">
                      <span>
                        Principal {((Number(calc.amount) / calcTotal) * 100).toFixed(0)}%
                      </span>
                      <span>
                        Interest {((calcInterest / calcTotal) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="interest-bar">
                      <div
                        className="interest-bar-fill principal"
                        style={{ width: `${(Number(calc.amount) / calcTotal) * 100}%` }}
                      />
                      <div
                        className="interest-bar-fill interest-part"
                        style={{ width: `${(calcInterest / calcTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// ─── Loan Card ────────────────────────────────────────────────────────────────

function LoanCard({ loan, onPayEMI, onAdvancePayment, onCloseLoan, onEdit, completed }) {
  const emi = getLoanEMI(loan);
  const totalEMIs = loan.tenureYears * 12;
  const totalPayable = emi * totalEMIs;
  const totalInterest = totalPayable - loan.principalAmount;
  const progress = (loan.paidEMIs / totalEMIs) * 100;
  const remainingEMIs = totalEMIs - loan.paidEMIs;
  const remainingAmount = emi * remainingEMIs;
  const { nextDueDate, daysRemaining, status: dueStatus } = getEMIDueInfo(loan);

  return (
    <div className={`loan-card ${completed ? "completed-loan" : ""}`}>
      <div className="loan-card-header">
        <div className="loan-icon">{CATEGORY_ICONS[loan.category]}</div>
        <div className="loan-title-wrap">
          <div className="loan-title">{loan.title}</div>
          <div className="loan-category">
            {loan.category} · {loan.interestRate}% · {loan.tenureYears}yr
          </div>
          {loan.bankName && (
            <div className="loan-bank-tag">
              <FaUniversity size={11} /> {loan.bankName}
            </div>
          )}
        </div>
        <div className="loan-card-actions">
          {!completed && (
            <>
              <button className="action-btn close-loan-btn" onClick={onCloseLoan}>
                Close Loan
              </button>
              <button
                className="action-btn edit-btn"
                onClick={() => onEdit && onEdit(loan)}
                title="Edit loan"
                aria-label="Edit loan"
              >
                <FaEdit />
              </button>
            </>
          )}
        </div>
      </div>

      {/* EMI Due status row */}
      {!completed && (
        <div className={`emi-due-row emi-due-row-${dueStatus.toLowerCase().replace(" ", "-")}`}>
          <span className="emi-due-label">
            {dueStatus === "Overdue"
              ? `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? "s" : ""}`
              : dueStatus === "Due Today"
                ? "EMI Due Today!"
                : dueStatus === "Paid"
                  ? "This month's EMI paid"
                  : `Next EMI: ${nextDueDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })} (${daysRemaining}d)`}
          </span>
          <span className={`emi-due-badge emi-due-${dueStatus.toLowerCase().replace(" ", "-")}`}>
            {dueStatus}
          </span>
        </div>
      )}

      <div className="loan-amounts">
        <div className="loan-amt-item">
          <span>Principal</span>
          <strong>₹{loan.principalAmount.toLocaleString()}</strong>
        </div>
        <div className="loan-amt-item">
          <span>Total Payable</span>
          <strong>₹{Math.round(totalPayable).toLocaleString()}</strong>
        </div>
        <div className="loan-amt-item">
          <span>Interest</span>
          <strong style={{ color: "#dc2626" }}>₹{Math.round(totalInterest).toLocaleString()}</strong>
        </div>
      </div>

      <div className="loan-emi-row">
        <span>Monthly EMI</span>
        <strong className="emi-amount">₹{Math.round(emi).toLocaleString()}</strong>
      </div>

      <div className="loan-progress-wrap">
        <div className="loan-progress-bar">
          <div
            className="loan-progress-fill"
            style={{ width: `${progress}%`, background: completed ? "#10b981" : "#6c8cff" }}
          />
        </div>
        <span className="loan-progress-pct">{progress.toFixed(0)}%</span>
      </div>

      <div className="loan-emis-info">
        <span>{loan.paidEMIs}/{totalEMIs} EMIs paid</span>
        {!completed && (
          <span style={{ color: "#dc2626" }}>
            ₹{Math.round(remainingAmount).toLocaleString()} left
          </span>
        )}
        {!completed && (loan.advancePaidAmount || 0) > 0 && (
          <span style={{ color: "#059669", fontSize: 12 }}>
            +₹{Number(loan.advancePaidAmount).toLocaleString("en-IN")} advance paid
          </span>
        )}
      </div>

      {completed ? (
        <div
          className="loan-completed-badge"
          style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}
        >
          <GiPartyPopper size={18} /> Loan Completed!
        </div>
      ) : dueStatus === "Paid" ? (
        <div className="emi-paid-notice">
          <FaCheckCircle size={14} color="#059669" />
          <span>
            EMI paid for {new Date().toLocaleString("en-IN", { month: "long" })}.
            Next due:{" "}
            <strong>
              {nextDueDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </strong>
          </span>
        </div>
      ) : (
        <button
          className="btn btn-primary pay-emi-btn"
          onClick={onPayEMI}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          <FaCheckCircle size={16} />
          Pay EMI — ₹{Math.round(emi).toLocaleString()}
        </button>
      )}

      {!completed && dueStatus !== "Due Today" && dueStatus !== "Overdue" && (
        <button
          className="btn btn-secondary advance-pay-btn"
          onClick={onAdvancePayment}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginTop: 8,
            width: "100%",
          }}
        >
          Pay in Advance
        </button>
      )}
    </div>
  );
}