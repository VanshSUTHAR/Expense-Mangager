import React, { useState, useEffect } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import swal from "sweetalert";
import {
  FaCar, FaHome, FaBriefcase, FaCheckCircle,
  FaUniversity, FaCalculator, FaPlus, FaEdit
} from "react-icons/fa";
import { MdSchool } from "react-icons/md";
import { GiTakeMyMoney, GiPartyPopper } from "react-icons/gi";
import { IoClose } from "react-icons/io5";

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
  return custom > 0 ? custom : calculateEMI(loan.principalAmount, loan.interestRate, loan.tenureYears);
};

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [showCalc, setShowCalc] = useState(false);
  const [customEMI, setCustomEMI] = useState("");
  const [editEMI, setEditEMI] = useState(false);

   const savedBanks = JSON.parse(localStorage.getItem("banks")) || [];
   const savedCards = JSON.parse(localStorage.getItem("cards")) || [];

   const [selectedBankFilter, setSelectedBankFilter] = useState("");

   const [emiBankSelections, setEmiBankSelections] = useState({});

  const [calc, setCalc] = useState({ amount: "", rate: "", years: "" });

  const [form, setForm] = useState({
    title: "",
    category: "car",
    principalAmount: "",
    interestRate: "",
    tenureYears: "",
    startDate: new Date().toISOString().split("T")[0],
    notes: "",
    bankName: "",
    accountNumber: "",
  });

  const previewEMI = form.principalAmount && form.interestRate && form.tenureYears
    ? Number(customEMI) || Math.round(calculateEMI(Number(form.principalAmount), Number(form.interestRate), Number(form.tenureYears)))
    : 0;
  const previewTotalPayable = previewEMI * Number(form.tenureYears || 0) * 12;
  const previewTotalInterest = previewTotalPayable - Number(form.principalAmount || 0);

  useEffect(() => { fetchLoans(); }, []);

  const fetchLoans = async () => {
    try {
      const { data } = await api.get("/loans");
      setLoans(data.loans);
    } catch (err) {
      toast.error("Failed to fetch loans");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        category: form.category,
        principalAmount: Number(form.principalAmount) || 0,
        interestRate: Number(form.interestRate) || 0,
        tenureYears: Number(form.tenureYears) || 0,
        customEMI: Number(customEMI) || 0,
        startDate: form.startDate,
        notes: form.notes,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
      };

      if (editingLoanId) {
        const res = await api.put(`/loans/${editingLoanId}`, payload);
        const updated = res.data?.loan || res.data;
        setLoans(prev => prev.map(l => l._id === editingLoanId ? { ...l, ...updated } : l));
        toast.success("Loan updated!");
        setEditingLoanId(null);
      } else {
        const res = await api.post("/loans", payload);
        const created = res.data?.loan || res.data;
        setLoans(prev => [created, ...prev]);
        toast.success("Loan added!");
      }
      setShowModal(false);
      resetForm();
      await fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error adding loan");
    }
  };

   const handlePayEMI = async (loan, selectedPaymentSource) => {
    if (!selectedPaymentSource) {
      toast.error("Please select a bank or credit card to pay EMI from");
      return;
    }

    try {
      const [sourceType, sourceName = selectedPaymentSource] = selectedPaymentSource.split(":");
      const bank = sourceType === "bank" || sourceType === sourceName ? savedBanks.find(b => b.bankName === sourceName) : null;
      const card = sourceType === "card" ? savedCards.find(c => c.cardName === sourceName) : null;
      const paymentName = bank?.bankName || card?.cardName || "";
      const paymentNumber = bank?.accountNumber || card?.cardNumber || loan.accountNumber || "";

       await api.post(`/loans/${loan._id}/pay-emi`, { bankName: paymentName });

       const emi = getLoanEMI(loan);

      await api.post("/transactions", {
        type: "expense",
        amount: Math.round(emi),
        category: "loan_emi",
        description: `EMI - ${loan.title}`,
        date: new Date().toISOString().split("T")[0],
        paymentMethod: card ? "credit_card" : "netbanking",
        bankName: paymentName,
        accountNumber: paymentNumber,
        isLoanEMI: true,
        loanId: loan._id,
        loanTitle: loan.title,
      });

      toast.success(
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FaCheckCircle />
          <span>EMI paid! Transaction saved in {paymentName}</span>
        </div>
      );
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error paying EMI");
    }
  };

  const handleDelete = async (id) => {
    const willDelete = await swal({
      title: "Are you sure?",
      text: "This will permanently delete the loan.",
      icon: "warning",
      buttons: ["Cancel", "Delete"],
      dangerMode: true,
    });
    if (!willDelete) return;
    try {
      await api.delete(`/loans/${id}`);
      toast.success("Loan deleted");
      fetchLoans();
    } catch (err) {
      toast.error("Error deleting loan");
    }
  };

  const resetForm = () => {
    setCustomEMI("");
    setEditEMI(false);
    setForm({
    title: "", category: "car",
    principalAmount: "", interestRate: "",
    tenureYears: "", startDate: new Date().toISOString().split("T")[0],
    notes: "", bankName: "", accountNumber: "",
    });
  };

  const handleEditLoan = (loan) => {
    setForm({
      title: loan.title || "",
      category: loan.category || "car",
      principalAmount: loan.principalAmount || "",
      interestRate: loan.interestRate || "",
      tenureYears: loan.tenureYears || "",
      startDate: loan.startDate ? loan.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
      notes: loan.notes || "",
      bankName: loan.bankName || "",
      accountNumber: loan.accountNumber || "",
    });
    setEditingLoanId(loan._id);
    setCustomEMI(loan.customEMI || "");
    setEditEMI(false);
    setShowModal(true);
  };

  const calcEMI = calc.amount && calc.rate && calc.years
    ? calculateEMI(Number(calc.amount), Number(calc.rate), Number(calc.years)) : 0;
  const calcTotal = calcEMI * Number(calc.years) * 12;
  const calcInterest = calcTotal - Number(calc.amount);

  const allActive = loans.filter(l => l.status === "active");
  const allCompleted = loans.filter(l => l.status === "completed");

   const activeLoans = selectedBankFilter
    ? allActive.filter(l => l.bankName === selectedBankFilter)
    : allActive;
  const completedLoans = selectedBankFilter
    ? allCompleted.filter(l => l.bankName === selectedBankFilter)
    : allCompleted;

  const totalDebt = activeLoans.reduce((s, l) => s + l.principalAmount, 0);
  const totalEMIPerMonth = activeLoans.reduce(
    (s, l) => s + getLoanEMI(l), 0
  );

  return (
    <div className="loans-page fade-in">

      <div className="page-header">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaUniversity size={30} />
            Loans
          </h1>
          <p className="page-sub">Manage your loans & EMIs</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setShowCalc(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaCalculator size={16} /> EMI Calculator
          </button>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditingLoanId(null); resetForm(); }}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaPlus size={14} /> Add Loan
          </button>
        </div>
      </div>

       <div className="loan-summary">
        <div className="loan-sum-card">
          <div className="sum-label">Total Debt</div>
          <div className="sum-value" style={{ color: "#dc2626" }}>₹{totalDebt.toLocaleString()}</div>
        </div>
        <div className="loan-sum-card">
          <div className="sum-label">Active Loans</div>
          <div className="sum-value">{activeLoans.length}</div>
        </div>
        <div className="loan-sum-card" >
          <div className="sum-label">Monthly EMI Total</div>
          <div className="sum-value" style={{ color: "#d97706" }}>
            ₹{Math.round(totalEMIPerMonth).toLocaleString()}
          </div>
        </div>
        <div className="loan-sum-card">
          <div className="sum-label">Loans Completed</div>
          <div className="sum-value" style={{ color: "#059669" }}>{allCompleted.length}</div>
        </div>
      </div>

       <div className="loans-bank-filter">
        <label className="bank-filter-label">
          <FaUniversity size={14} /> Filter by Bank
        </label>
        <select
          className="input bank-filter-select"
          value={selectedBankFilter}
          onChange={e => setSelectedBankFilter(e.target.value)}
        >
          <option value="">All Banks</option>
          {savedBanks.map((bank, i) => (
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
          <div style={{ fontSize: 13, color: "#7a86b6", marginTop: 6 }}>Add your first loan to track EMIs</div>
        </div>
      ) : (
        <>
          {activeLoans.length > 0 && (
            <>
              <h2 className="section-title">Active Loans</h2>
              <div className="loans-grid">
                {activeLoans.map(loan => (
                  <LoanCard 
                    key={loan._id} 
                    loan={loan}
                    onPayEMI={handlePayEMI} 
                    onDelete={handleDelete} 
                    onEdit={handleEditLoan}
                    savedBanks={savedBanks}
                    savedCards={savedCards}
                    emiBankSelections={emiBankSelections}
                    setEmiBankSelections={setEmiBankSelections}
                  />
                ))}
              </div>
            </>
          )}
          {completedLoans.length > 0 && (
            <>
              <h2 className="section-title" style={{ marginTop: 28, display: "flex", alignItems: "center", gap: "8px" }}>
                <FaCheckCircle size={22} /> Completed
              </h2>
              <div className="loans-grid">
                {completedLoans.map(loan => (
                  <LoanCard 
                    key={loan._id} 
                    loan={loan}
                    onPayEMI={handlePayEMI} 
                    onDelete={handleDelete} 
                    onEdit={handleEditLoan}
                    savedBanks={savedBanks}
                    savedCards={savedCards}
                    emiBankSelections={emiBankSelections}
                    setEmiBankSelections={setEmiBankSelections}
                    completed 
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setShowModal(false), setEditingLoanId(null), resetForm())}>
          <div className="modal fade-in">
            <div className="modal-header">
              <h3>{editingLoanId ? "Edit Loan" : "Add New Loan"}</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingLoanId(null); resetForm(); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Loan Title</label>
                <input className="input" placeholder="e.g. Car Loan - Maruti Swift"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select className="input" value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="car"> Car</option>
                    <option value="home"> Home</option>
                    <option value="personal"> Personal</option>
                    <option value="education"> Education</option>
                    <option value="other"> Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input className="input" type="date" value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Loan Amount (₹)</label>
                  <input className="input" type="number" placeholder="e.g. 800000"
                    value={form.principalAmount}
                    onChange={e => setForm({ ...form, principalAmount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Interest Rate (% per year)</label>
                  <input className="input" type="number" step="0.1" placeholder="e.g. 10.5"
                    value={form.interestRate}
                    onChange={e => setForm({ ...form, interestRate: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tenure (Years)</label>
                  <input className="input" type="number" placeholder="e.g. 5"
                    value={form.tenureYears}
                    onChange={e => setForm({ ...form, tenureYears: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Bank (Loan Linked Bank)</label>
                  <select className="input" value={form.bankName}
                    onChange={e => {
                      const sel = savedBanks.find(b => b.bankName === e.target.value);
                      setForm({ ...form, bankName: sel?.bankName || "", accountNumber: sel?.accountNumber || "" });
                    }}>
                    <option value="">Select Bank</option>
                    {savedBanks.map((bank, i) => (
                      <option key={i} value={bank.bankName}>
                        🏦 {bank.bankName} — ••••{bank.accountNumber.slice(-4)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

               {form.principalAmount && form.interestRate && form.tenureYears && (
                <div className="loan-preview">
                  <div className="preview-item">
                    <span>Monthly EMI</span>
                    {!editEMI ? (
                      <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        ₹{previewEMI.toLocaleString()}
                        <FaEdit style={{ cursor: "pointer", color: "#6b7280", fontSize: "14px" }}
                          onClick={() => setEditEMI(true)} />
                      </strong>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input type="number" className="input" value={customEMI}
                          placeholder={Math.round(calculateEMI(Number(form.principalAmount), Number(form.interestRate), Number(form.tenureYears)))}
                          onChange={e => setCustomEMI(e.target.value)}
                          style={{ width: "140px", height: "36px", padding: "6px 10px" }} />
                        <button type="button" className="btn btn-primary" onClick={() => setEditEMI(false)}>Save</button>
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
                <input className="input" placeholder="Optional..."
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingLoanId(null); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingLoanId ? "Save Changes" : "➕ Add Loan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

       {showCalc && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCalc(false)}>
          <div className="modal fade-in" style={{ maxWidth: 440 }}>
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
              <input className="input" type="number" placeholder="e.g. 800000"
                value={calc.amount} onChange={e => setCalc({ ...calc, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Interest Rate (% per year)</label>
              <input className="input" type="number" step="0.1" placeholder="e.g. 10.5"
                value={calc.rate} onChange={e => setCalc({ ...calc, rate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tenure (Years)</label>
              <input className="input" type="number" placeholder="e.g. 5"
                value={calc.years} onChange={e => setCalc({ ...calc, years: e.target.value })} />
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
                  <strong style={{ color: "#059669" }}>₹{Number(calc.amount).toLocaleString()}</strong>
                </div>
                <div className="calc-row">
                  <span>Total Interest</span>
                  <strong style={{ color: "#dc2626" }}>₹{Math.round(calcInterest).toLocaleString()}</strong>
                </div>
                <div className="interest-bar-wrap">
                  <div className="interest-bar-label">
                    <span>Principal {((Number(calc.amount) / calcTotal) * 100).toFixed(0)}%</span>
                    <span>Interest {((calcInterest / calcTotal) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="interest-bar">
                    <div className="interest-bar-fill principal"
                      style={{ width: `${(Number(calc.amount) / calcTotal) * 100}%` }} />
                    <div className="interest-bar-fill interest-part"
                      style={{ width: `${(calcInterest / calcTotal) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LoanCard({ 
  loan, onPayEMI, onDelete, onEdit, completed, 
  savedBanks, savedCards, emiBankSelections, setEmiBankSelections 
}) {
  const emi = getLoanEMI(loan);
  const totalEMIs = loan.tenureYears * 12;
  const totalPayable = emi * totalEMIs;
  const totalInterest = totalPayable - loan.principalAmount;
  const progress = (loan.paidEMIs / totalEMIs) * 100;
  const remainingEMIs = totalEMIs - loan.paidEMIs;
  const remainingAmount = emi * remainingEMIs;

   const currentSelectedBank = emiBankSelections[loan._id] || (loan.bankName ? `bank:${loan.bankName}` : "");

  return (
    <div className={`loan-card ${completed ? "completed-loan" : ""}`}>
      <div className="loan-card-header">
        <div className="loan-icon">{CATEGORY_ICONS[loan.category]}</div>
        <div className="loan-title-wrap">
          <div className="loan-title">{loan.title}</div>
          <div className="loan-category">
            {loan.category} loan · {loan.interestRate}% · {loan.tenureYears}yr
          </div>
          {loan.bankName && (
            <div className="loan-bank-tag">
              <FaUniversity size={11} /> {loan.bankName}
            </div>
          )}
        </div>
        <button className="action-btn edit-btn" onClick={() => onEdit && onEdit(loan)}>
          <FaEdit />
        </button>
        <button className="action-btn delete-btn" onClick={() => onDelete(loan._id)}>🗑️</button>
      </div>

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
          <div className="loan-progress-fill"
            style={{ width: `${progress}%`, background: completed ? "#10b981" : "#6c8cff" }} />
        </div>
        <span className="loan-progress-pct">{progress.toFixed(0)}%</span>
      </div>

      <div className="loan-emis-info">
        <span>{loan.paidEMIs}/{totalEMIs} EMIs paid</span>
        {!completed && (
          <span style={{ color: "#dc2626" }}>₹{Math.round(remainingAmount).toLocaleString()} left</span>
        )}
      </div>

       {!completed && (
        <div className="form-group" style={{ marginTop: "12px", marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#4a5568" }}>
            Pay EMI From
          </label>
          <select 
            className="input" 
            value={currentSelectedBank}
            onChange={(e) => setEmiBankSelections({
              ...emiBankSelections,
              [loan._id]: e.target.value
            })}
            style={{ width: "100%", padding: "8px 10px", borderRadius: "6px" }}
          >
            <option value="">Select Bank or Credit Card</option>
            {savedBanks.map((bank, i) => (
              <option key={`bank-${i}`} value={`bank:${bank.bankName}`}>
                 {bank.bankName} — ••••{bank.accountNumber.slice(-4)}
              </option>
            ))}
            {savedCards.map((card, i) => (
              <option key={`card-${i}`} value={`card:${card.cardName}`}>
                 Credit Card - {card.cardName} - xxxx{card.cardNumber.slice(-4)}
              </option>
            ))}
          </select>
        </div>
      )}

      {!completed ? (
        <button className="btn btn-primary pay-emi-btn"
          onClick={() => onPayEMI(loan, currentSelectedBank)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <FaCheckCircle size={16} />
          Pay EMI — ₹{Math.round(emi).toLocaleString()}
        </button>
      ) : (
        <div className="loan-completed-badge"
          style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
          <GiPartyPopper size={18} /> Loan Completed!
        </div>
      )}
    </div>
  );
}
