import { useState, useEffect } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { FaCreditCard, FaEdit, FaTrash } from "react-icons/fa";
import { FaArrowTrendUp, FaArrowTrendDown } from "react-icons/fa6";
import { FaSave, FaPlus } from "react-icons/fa";
import "./Transactions.css";
import { TbTransfer } from "react-icons/tb";

const CATEGORIES = {
  expense: ["Food", "Transport", "Shopping", "Health", "Entertainment", "Rent", "Utilities", "Education", "Other"],
};

const today = () => new Date().toISOString().split("T")[0];

const expenseMinDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().split("T")[0];
};

const incomeMinDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().split("T")[0];
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [emiBillTarget, setEmiBillTarget] = useState(null);
  const [emiMonths, setEmiMonths] = useState(6);
  const [showAllPaidBills, setShowAllPaidBills] = useState(false);

  const savedBanks = JSON.parse(localStorage.getItem("banks")) || [];
  const savedCards = JSON.parse(localStorage.getItem("cards")) || [];
  const currentBank = savedBanks.find(b => b.bankName === localStorage.getItem("selectedBank"));
  const currentCard = savedCards.find(c => c.cardName === localStorage.getItem("selectedCard"));
  const defaultExpenseSource = currentCard
    ? { name: currentCard.cardName, number: currentCard.cardNumber }
    : { name: currentBank?.bankName || "", number: currentBank?.accountNumber || "" };

  const [filters, setFilters] = useState({ type: "", bankName: "" });

  const [form, setForm] = useState({
    type: "expense", amount: "", category: "", description: "",
    date: today(), paymentMethod: currentCard ? "credit_card" : "card",
    bankName: defaultExpenseSource.name,
    accountNumber: defaultExpenseSource.number,
  });

  useEffect(() => {
    fetchAllTransactions();
    fetchCreditCardBills();
  }, []);
  useEffect(() => { applyFilters(); }, [filters, allTransactions]);

  const fetchAllTransactions = async () => {
    try {
      const { data } = await api.get("/transactions?limit=1000");
      const sorted = (data.transactions || []).sort(
        (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
      );
      setAllTransactions(sorted);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditCardBills = async () => {
    try {
      const { data } = await api.get("/credit-card-bills");
      setBills(data.bills || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch credit card bills");
    } finally {
      setBillsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allTransactions];
    if (filters.type) filtered = filtered.filter(tx => tx.type === filters.type);
    if (filters.bankName) filtered = filtered.filter(tx => tx.bankName === filters.bankName);
    setTransactions(filtered);
  };

  const calculateTotalBalance = () => {
    const source = filters.bankName
      ? allTransactions.filter(tx => tx.bankName === filters.bankName)
      : allTransactions;
    return source.reduce((total, tx) => {
      const amount = Number(tx.amount) || 0;
      return tx.type === "income" ? total + amount : total - amount;
    }, 0);
  };

  const calculateIncome = () => {
    const source = filters.bankName
      ? allTransactions.filter(tx => tx.bankName === filters.bankName)
      : allTransactions;
    return source.filter(tx => tx.type === "income")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  };

  const calculateExpense = () => {
    const source = filters.bankName
      ? allTransactions.filter(tx => tx.bankName === filters.bankName)
      : allTransactions;
    return source.filter(tx => tx.type === "expense")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  };

  const getRunningBalance = (tx) => {
    const bankTxs = filters.bankName
      ? allTransactions.filter(t => t.bankName === filters.bankName)
      : allTransactions;
    const sorted = [...bankTxs].sort(
      (a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)
    );
    let balance = 0;
    for (const t of sorted) {
      const amount = Number(t.amount) || 0;
      if (t.type === "income") balance += amount;
      else balance -= amount;
      if (t._id === tx._id) break;
    }
    return balance;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.type === "expense" && !form.category) {
        toast.error("Please select category");
        return;
      }
      const payload = {
        ...form,
        amount: Number(form.amount),
        category: form.type === "income" ? "income" : form.category,
        paymentMethod: form.type === "income" ? "" : form.paymentMethod,
      };
      if (editTx) {
        await api.put(`/transactions/${editTx._id}`, payload);
        toast.success("Transaction updated! ✅");
      } else {
        const currentBalance = calculateTotalBalance();
        const remainingBalance = currentBalance + (payload.type === "income" ? payload.amount : -payload.amount);
        await api.post("/transactions", payload);
        toast.success(`${payload.type} of ₹${Number(payload.amount).toLocaleString()} complete ✅ Balance: ₹${Math.abs(remainingBalance).toLocaleString()}`);
      }
      setShowModal(false);
      setEditTx(null);
      resetForm();
      fetchAllTransactions();
      fetchCreditCardBills();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving transaction");
    }
  };

  const handlePayFullBill = async (bill) => {
    try {
      const result = await Swal.fire({
        title: "Pay full statement?",
        text: "All transactions in this statement will be marked as paid.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Pay Full Bill",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#111827",
      });

      if (!result.isConfirmed) return;

      await api.put(`/credit-card-bills/${bill._id}/pay`);
      toast.success("Credit card bill marked as paid");
      fetchCreditCardBills();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error paying credit card bill");
    }
  };

  const handleOpenEmiModal = (bill) => {
    setEmiBillTarget(bill);
    setEmiMonths(6);
  };

  const handleConvertBillToEMI = async () => {
    if (!emiBillTarget) return;

    try {
      await api.put(`/credit-card-bills/${emiBillTarget._id}/convert-to-emi`, {
        months: emiMonths,
      });
      toast.success(`Converted to ${emiMonths}-month EMI plan`);
      setEmiBillTarget(null);
      fetchCreditCardBills();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error converting statement to EMI");
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: "Delete this transaction?",
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6b7280",
      });
      if (!result.isConfirmed) return;
      await api.delete(`/transactions/${id}`);
      toast.success("Deleted!");
      fetchAllTransactions();
      fetchCreditCardBills();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleEdit = (tx) => {
    setEditTx(tx);
    setForm({
      type: tx.type, amount: tx.amount, category: tx.category,
      description: tx.description || "", date: tx.date.split("T")[0],
      paymentMethod: tx.paymentMethod || "card",
      bankName: tx.bankName || "", accountNumber: tx.accountNumber || "",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    const banks = JSON.parse(localStorage.getItem("banks")) || [];
    const cards = JSON.parse(localStorage.getItem("cards")) || [];
    const bank = banks.find(b => b.bankName === localStorage.getItem("selectedBank"));
    const card = cards.find(c => c.cardName === localStorage.getItem("selectedCard"));
    setForm({
      type: "expense", amount: "", category: "", description: "",
      date: today(), paymentMethod: card ? "credit_card" : "card",
      bankName: card?.cardName || bank?.bankName || "",
      accountNumber: card?.cardNumber || bank?.accountNumber || "",
    });
  };

  const openAdd = () => { setEditTx(null); resetForm(); setShowModal(true); };

  const handleTypeChange = (t) => {
    const banks = JSON.parse(localStorage.getItem("banks")) || [];
    const cards = JSON.parse(localStorage.getItem("cards")) || [];
    const bank = banks.find(b => b.bankName === localStorage.getItem("selectedBank"));
    const card = cards.find(c => c.cardName === localStorage.getItem("selectedCard"));
    const expenseSource = card
      ? { paymentMethod: "credit_card", bankName: card.cardName, accountNumber: card.cardNumber }
      : { paymentMethod: "card", bankName: bank?.bankName || "", accountNumber: bank?.accountNumber || "" };
    setForm({
      ...form, type: t, category: "", date: today(),
      paymentMethod: t === "expense" ? expenseSource.paymentMethod : "",
      bankName: t === "expense" ? expenseSource.bankName : bank?.bankName || "",
      accountNumber: t === "expense" ? expenseSource.accountNumber : bank?.accountNumber || "",
    });
  };

  const totalBalance = calculateTotalBalance();
  const totalIncome = calculateIncome();
  const totalExpense = calculateExpense();
  const pendingBills = bills.filter(bill => bill.status === "Pending");
  const emiBills = bills.filter(bill => bill.status === "EMI");
  const paidBills = bills.filter(bill => bill.status === "Paid");
  const overdueBills = bills.filter(bill => bill.status === "Overdue");

  const displayTxs = [...transactions].sort(
    (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
  );

  return (
    <div className="transactions-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="transaction-title">
            <TbTransfer className="transaction-icon" /> Transactions
          </h1>
          <p className="page-sub">
            {filters.bankName ? `Showing: ${filters.bankName}` : "All Accounts & Cards"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Transaction</button>
      </div>

      <div className="summary-wrapper">
        <div className="summary-card balance-card">
          <h3>{filters.bankName ? `${filters.bankName} Balance` : "Total Balance"}</h3>
          <h1 className={totalBalance >= 0 ? "amount-positive" : "amount-negative"}>
            ₹{Math.abs(totalBalance).toLocaleString()}
          </h1>
        </div>
        <div className="summary-card expense-card">
          <h3>{filters.bankName ? `${filters.bankName} Expense` : "Total Expense"}</h3>
          <h1>₹{totalExpense.toLocaleString()}</h1>
        </div>
        <div className="summary-card income-card">
          <h3>{filters.bankName ? `${filters.bankName} Income` : "Total Income"}</h3>
          <h1>₹{totalIncome.toLocaleString()}</h1>
        </div>
      </div>

      <div className="filters card">
        <select className="input filter-select" value={filters.type}
          onChange={e => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
                    <option value="expense">Loan EMI</option>

        </select>
        <select className="input filter-select" value={filters.bankName}
          onChange={e => setFilters({ ...filters, bankName: e.target.value })}>
          <option value="">All Accounts & Cards</option>
          {savedBanks.map((bank, i) => (
            <option key={`bank-${i}`} value={bank.bankName}>{bank.bankName}</option>
          ))}
          {savedCards.map((card, i) => (
            <option key={`card-${i}`} value={card.cardName}>{card.cardName}</option>
          ))}
        </select>
        {(filters.type || filters.bankName) && (
          <button className="btn btn-secondary"
            onClick={() => setFilters({ type: "", bankName: "" })}>Clear</button>
        )}
      </div>

      <div className="card credit-card-bills-card">
        <div className="section-header">
          <h3><FaCreditCard /> Credit Card Bills</h3>
          <span className="credit-period-note">45-day credit period from transaction date</span>
        </div>

        {billsLoading ? (
          <div className="empty-state"><span className="loading" /></div>
        ) : bills.length === 0 ? (
          <div className="empty-state">No credit card bills yet</div>
        ) : (
          <div className="credit-bill-columns">
            <CreditBillGroup
              title="Pending Bills"
              bills={pendingBills}
              expandedBillId={expandedBillId}
              onToggleBill={setExpandedBillId}
              onPayFullBill={handlePayFullBill}
              onConvertToEmi={handleOpenEmiModal}
            />
            <CreditBillGroup
              title="EMI Bills"
              bills={emiBills}
              expandedBillId={expandedBillId}
              onToggleBill={setExpandedBillId}
            />
            <CreditBillGroup
              title="Paid Bills"
              bills={paidBills}
              expandedBillId={expandedBillId}
              onToggleBill={setExpandedBillId}
              showAllPaidBills={showAllPaidBills}
              onToggleShowAllPaidBills={() => setShowAllPaidBills((prev) => !prev)}
            />
            <CreditBillGroup
              title="Overdue Bills"
              bills={overdueBills}
              expandedBillId={expandedBillId}
              onToggleBill={setExpandedBillId}
              onPayFullBill={handlePayFullBill}
              onConvertToEmi={handleOpenEmiModal}
            />
          </div>
        )}
      </div>

      <div className="card tx-table-card">
        {loading ? (
          <div className="empty-state"><span className="loading" /></div>
        ) : displayTxs.length === 0 ? (
          <div className="empty-state">No transactions found </div>
        ) : (
          <table className="tx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Account / Card</th>
                <th>Bank-EMI</th>
                <th>Category</th>
                <th>Payment</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayTxs.map(tx => (
                <tr key={tx._id} className={tx.isLoanEMI ? "loan-emi-row-highlight" : ""}>
                  <td className="tx-date">{new Date(tx.date).toLocaleDateString()}</td>
                  <td>
                    {tx.bankName ? (
                      <div className="bank-cell">
                        <div>
                          <div className="bank-cell-name">{tx.bankName}</div>
                          {tx.accountNumber && (
                            <div className="bank-cell-acc">••••{tx.accountNumber.slice(-4)}</div>
                          )}
                        </div>
                      </div>
                    ) : "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {tx.description || "—"}
                       {tx.isLoanEMI && (
                        <span className="loan-emi-badge">🏦 Loan EMI</span>
                      )}
                    </div>
                    {tx.loanTitle && (
                      <div className="loan-title-small">{tx.loanTitle}</div>
                    )}
                  </td>
                  <td><span className="cat-chip">{tx.category || "—"}</span></td>
                  <td>
                    {tx.paymentMethod ? (
                      <span className="payment-method-chip">{tx.paymentMethod.toUpperCase()}</span>
                    ) : "—"}
                  </td>
                  <td><span className={`badge badge-${tx.type}`}>{tx.type}</span></td>
                  <td className={tx.type === "income" ? "amount-positive" : "amount-negative"}>
                    {tx.type === "income" ? "+" : "-"}₹{Number(tx.amount).toLocaleString()}
                  </td>
                  <td className="running-balance">₹{getRunningBalance(tx).toLocaleString()}</td>
                  <td className="tx-actions">
                    <button className="action-btn edit-btn" onClick={() => handleEdit(tx)}><FaEdit /></button>
                    <button className="action-btn delete-btn" onClick={() => handleDelete(tx._id)}><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal glass fade-in">
            <div className="modal-header">
              <h3>{editTx ? "Edit Transaction" : "New Transaction"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="type-toggle">
                {["expense", "income"].map(t => (
                  <button type="button" key={t}
                    className={`type-btn ${form.type === t ? "active-" + t : ""}`}
                    onClick={() => handleTypeChange(t)}>
                    {t === "income" ? <><FaArrowTrendUp /> Income</> : <><FaArrowTrendDown /> Expense</>}
                  </button>
                ))}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input className="input" type="number" placeholder="0.00"
                    value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    required min="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input className="input" type="date" value={form.date}
                    min={form.type === "expense" ? expenseMinDate() : incomeMinDate()}
                    max={today()}
                    onChange={e => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>
              {form.type === "expense" && (
                <>
                  <div className="form-group">
                    <label>Category</label>
                    <select className="input" value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })} required>
                      <option value="">Select category</option>
                      {CATEGORIES.expense.map(c => (
                        <option key={c} value={c.toLowerCase()}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select className="input" value={form.paymentMethod}
                      onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                      <option value="card">DEBIT CARD</option>
                      <option value="credit_card">CREDIT CARD</option>
                      <option value="upi">UPI</option>
                      <option value="netbanking">NETBANKING</option>
                      <option value="other">OTHER</option>
                    </select>
                  </div>
                </>
              )}
              <div className="form-group">
                <label>{form.type === "expense" ? "Pay From" : "Bank"}</label>
                <select className="input" value={form.bankName}
                  onChange={e => {
                    const selectedBank = savedBanks.find(b => b.bankName === e.target.value);
                    const selectedCard = savedCards.find(c => c.cardName === e.target.value);
                    setForm({
                      ...form,
                      bankName: selectedBank?.bankName || selectedCard?.cardName || "",
                      accountNumber: selectedBank?.accountNumber || selectedCard?.cardNumber || "",
                      paymentMethod: selectedCard ? "credit_card" : form.paymentMethod,
                    });
                  }}>
                  <option value="">Select Account or Card</option>
                  {savedBanks.map((bank, i) => (
                    <option key={`bank-${i}`} value={bank.bankName}>
                      Bank - {bank.bankName} - xxxx{bank.accountNumber.slice(-4)}
                    </option>
                  ))}
                  {form.type === "expense" && savedCards.map((card, i) => (
                    <option key={`card-${i}`} value={card.cardName}>
                      Credit Card - {card.cardName} - xxxx{card.cardNumber.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input className="input" type="text" placeholder="Optional note..."
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editTx ? <><FaSave /> Update</> : <><FaPlus /> Add</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {emiBillTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEmiBillTarget(null)}>
          <div className="modal glass fade-in" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Convert to EMI</h3>
              <button className="modal-close" onClick={() => setEmiBillTarget(null)}>✕</button>
            </div>

            <div className="credit-emi-summary">
              <div><strong>{emiBillTarget.cardName}</strong></div>
              <div>Outstanding: ₹{Number(emiBillTarget.outstandingAmount || emiBillTarget.totalAmount || 0).toLocaleString()}</div>
              <div>Choose EMI duration</div>
            </div>

            <div className="emi-term-grid">
              {[3, 6, 9, 12].map((months) => (
                <button
                  key={months}
                  type="button"
                  className={`emi-term-btn ${emiMonths === months ? "active" : ""}`}
                  onClick={() => setEmiMonths(months)}
                >
                  {months} Months
                </button>
              ))}
            </div>

            <div className="credit-emi-calculation">
              Monthly installment: ₹{Math.round(Number(emiBillTarget.outstandingAmount || emiBillTarget.totalAmount || 0) / emiMonths).toLocaleString()}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEmiBillTarget(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConvertBillToEMI}>
                Convert to EMI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreditBillGroup({
  title,
  bills,
  expandedBillId,
  onToggleBill,
  onPayFullBill,
  onConvertToEmi,
  showAllPaidBills = true,
  onToggleShowAllPaidBills,
}) {
  const isPaidGroup = title === "Paid Bills";
  const visibleBills = isPaidGroup && !showAllPaidBills ? bills.slice(0, 5) : bills;
  const hasMorePaidBills = isPaidGroup && bills.length > 5;

  return (
    <div className="credit-bill-group">
      <div className="credit-bill-group-title">
        <span>{title}</span>
        <strong>{bills.length}</strong>
      </div>

      {visibleBills.length === 0 ? (
        <div className="credit-bill-empty">No bills</div>
      ) : (
        <div className="credit-bill-list">
          {visibleBills.map((bill) => (
            <div key={bill._id} className={`credit-bill-item status-${bill.status.toLowerCase()}`}>
              <div className="credit-bill-top">
                <div>
                  <div className="credit-bill-card-name">{bill.cardName}</div>
                  <div className="credit-bill-meta">
                    {bill.cardNumber ? `xxxx${bill.cardNumber.slice(-4)} - ` : ""}
                    Statement {formatDate(bill.statementDate || bill.createdAt)}
                  </div>
                </div>
                <span className={`credit-bill-status status-${bill.status.toLowerCase()}`}>
                  {bill.status}
                </span>
              </div>

              <div className="credit-bill-amount">₹{Number(bill.outstandingAmount || bill.totalAmount || 0).toLocaleString()}</div>
              <div className="credit-bill-meta">{bill.transactionCount || bill.transactions?.length || 0} transactions</div>
              <div className="credit-bill-meta">Due {formatDate(bill.dueDate)}</div>
              <div className={bill.daysRemaining < 0 ? "credit-bill-overdue" : "credit-bill-days"}>
                {bill.status === "Paid"
                  ? `Paid ${bill.paidAt ? formatDate(bill.paidAt) : ""}`
                  : bill.daysRemaining < 0
                    ? `${Math.abs(bill.daysRemaining)} days overdue`
                    : `${bill.daysRemaining} days remaining`}
              </div>

              <button
                type="button"
                className="btn btn-secondary credit-bill-toggle-btn"
                onClick={() => onToggleBill(expandedBillId === bill._id ? null : bill._id)}
              >
                {expandedBillId === bill._id ? "Hide Transactions" : "View Transactions"}
              </button>

              {expandedBillId === bill._id && (
                <div className="credit-bill-accordion">
                  {(bill.transactions || []).length === 0 ? (
                    <div className="credit-bill-empty">No transaction details</div>
                  ) : (
                    (bill.transactions || []).map((transaction) => (
                      <div key={transaction._id || transaction.id} className="credit-bill-transaction">
                        <div>
                          <div className="credit-bill-transaction-title">
                            {transaction.description || transaction.category || "Transaction"}
                          </div>
                          <div className="credit-bill-meta">
                            {formatDate(transaction.date || transaction.createdAt)}
                          </div>
                        </div>
                        <strong>₹{Number(transaction.amount || 0).toLocaleString()}</strong>
                      </div>
                    ))
                  )}
                </div>
              )}

              {bill.status === "EMI" && bill.emiMonths ? (
                <div className="credit-bill-meta credit-bill-emi-note">
                  EMI plan: {bill.emiMonths} months · ₹{Math.round(bill.emiAmount || 0).toLocaleString()} / month
                </div>
              ) : null}

              {bill.status !== "Paid" && bill.status !== "EMI" && (
                <div className="credit-bill-actions">
                  <button
                    type="button"
                    className="btn btn-primary credit-bill-pay-btn"
                    onClick={() => onPayFullBill?.(bill)}
                  >
                    Pay Full Bill
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary credit-bill-pay-btn"
                    onClick={() => onConvertToEmi?.(bill)}
                  >
                    Convert to EMI
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasMorePaidBills && (
        <button
          type="button"
          className="btn btn-secondary credit-bill-viewall-btn"
          onClick={onToggleShowAllPaidBills}
        >
          {showAllPaidBills ? "Show Less" : "View All"}
        </button>
      )}
    </div>
  );
}

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}
