import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import './Transactions.css';

const CATEGORIES = {
  expense: [
    'Food', 'Transport', 'Shopping', 'Health',
    'Entertainment', 'Rent', 'Utilities', 'Education', 'Other'
  ]
};

const today = () => new Date().toISOString().split('T')[0];

const expenseMinDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().split('T')[0];
};

const incomeMinDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().split('T')[0];
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState(null);

  const savedBanks = JSON.parse(localStorage.getItem('banks')) || [];
  const currentBank = savedBanks.find(
    b => b.bankName === localStorage.getItem('selectedBank')
  );

  const [filters, setFilters] = useState({
    type: '',
    bankName: ''
  });

  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: today(),
    paymentMethod: 'card',
    bankName: currentBank?.bankName || '',
    accountNumber: currentBank?.accountNumber || ''
  });

  useEffect(() => {
    fetchAllTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, allTransactions]);

  // Fetch ALL transactions — for correct balance calculation
  const fetchAllTransactions = async () => {
    try {
      const { data } = await api.get('/transactions?limit=1000');
      const sorted = (data.transactions || []).sort(
        (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
      );
      setAllTransactions(sorted);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters on frontend
  const applyFilters = () => {
    let filtered = [...allTransactions];
    if (filters.type) {
      filtered = filtered.filter(tx => tx.type === filters.type);
    }
    if (filters.bankName) {
      filtered = filtered.filter(tx => tx.bankName === filters.bankName);
    }
    setTransactions(filtered);
  };

  // ─── BALANCE CALCULATIONS ───────────────────────────────

  // Total balance — based on selected bank or all banks
  const calculateTotalBalance = () => {
    const source = filters.bankName
      ? allTransactions.filter(tx => tx.bankName === filters.bankName)
      : allTransactions;

    return source.reduce((total, tx) => {
      const amount = Number(tx.amount) || 0;
      return tx.type === 'income' ? total + amount : total - amount;
    }, 0);
  };

  const calculateIncome = () => {
    const source = filters.bankName
      ? allTransactions.filter(tx => tx.bankName === filters.bankName)
      : allTransactions;

    return source
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  };

  const calculateExpense = () => {
    const source = filters.bankName
      ? allTransactions.filter(tx => tx.bankName === filters.bankName)
      : allTransactions;

    return source
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  };

  // Running balance — cumulative from oldest to newest
  // Uses ALL transactions of that bank (not filtered by type)
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
      if (t.type === 'income') {
        balance += amount;
      } else {
        balance -= amount;
      }
      if (t._id === tx._id) break;
    }
    return balance;
  };

  // ─── SUBMIT ─────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.type === 'expense' && !form.category) {
        toast.error('Please select category');
        return;
      }

      const payload = {
        ...form,
        amount: Number(form.amount),
        category: form.type === 'income' ? 'income' : form.category,
        paymentMethod: form.type === 'income' ? '' : form.paymentMethod
      };

      if (editTx) {
        await api.put(`/transactions/${editTx._id}`, payload);
        toast.success('Transaction updated! ✅');
      } else {
        const currentBalance = calculateTotalBalance();
        const remainingBalance = currentBalance + (payload.type === 'income' ? payload.amount : -payload.amount);

        await api.post('/transactions', payload);
        toast.success(
          `Your ${payload.type} of ₹${Number(payload.amount).toLocaleString()} in ${payload.category} is complete ✅ Money left: ₹${Math.abs(remainingBalance).toLocaleString()}`
        );
      }

      setShowModal(false);
      setEditTx(null);
      resetForm();
      fetchAllTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving transaction');
    }
  };

  // ─── DELETE ─────────────────────────────────────────────

  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: 'Delete this transaction?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6b7280'
      });

      if (!result.isConfirmed) return;

      await api.delete(`/transactions/${id}`);
      toast.success('Deleted!');
      fetchAllTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // ─── EDIT ───────────────────────────────────────────────

  const handleEdit = (tx) => {
    setEditTx(tx);
    setForm({
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      description: tx.description || '',
      date: tx.date.split('T')[0],
      paymentMethod: tx.paymentMethod || 'card',
      bankName: tx.bankName || '',
      accountNumber: tx.accountNumber || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    const banks = JSON.parse(localStorage.getItem('banks')) || [];
    const bank = banks.find(b => b.bankName === localStorage.getItem('selectedBank'));
    setForm({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      date: today(),
      paymentMethod: 'card',
      bankName: bank?.bankName || '',
      accountNumber: bank?.accountNumber || ''
    });
  };

  const openAdd = () => { setEditTx(null); resetForm(); setShowModal(true); };

  const handleTypeChange = (t) => {
    const banks = JSON.parse(localStorage.getItem('banks')) || [];
    const bank = banks.find(b => b.bankName === localStorage.getItem('selectedBank'));
    setForm({
      ...form,
      type: t,
      category: '',
      date: today(),
      paymentMethod: t === 'expense' ? 'card' : '',
      bankName: bank?.bankName || '',
      accountNumber: bank?.accountNumber || ''
    });
  };

  const totalBalance = calculateTotalBalance();
  const totalIncome = calculateIncome();
  const totalExpense = calculateExpense();

  // Display transactions newest first in table
  const displayTxs = [...transactions].sort(
    (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
  );

  return (
    <div className="transactions-page fade-in">

      <div className="page-header">
        <div>
          <h1>Transactions 💳</h1>
          <p className="page-sub">
            {filters.bankName
              ? `Showing: ${filters.bankName}`
              : 'All Banks'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Transaction
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="summary-wrapper">
        <div className="summary-card balance-card">
          <h3>
            {filters.bankName
              ? `${filters.bankName} Balance`
              : 'Total Balance'}
          </h3>
          <h1 className={totalBalance >= 0 ? 'amount-positive' : 'amount-negative'}>
            ₹{Math.abs(totalBalance).toLocaleString()}
          </h1>
        </div>

        <div className="summary-card expense-card">
          <h3>
            {filters.bankName
              ? `${filters.bankName} Expense`
              : 'Total Expense'}
          </h3>
          <h1>₹{totalExpense.toLocaleString()}</h1>
        </div>

        <div className="summary-card income-card">
          <h3>
            {filters.bankName
              ? `${filters.bankName} Income`
              : 'Total Income'}
          </h3>
          <h1>₹{totalIncome.toLocaleString()}</h1>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filters card">
        <select className="input filter-select" value={filters.type}
          onChange={e => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select className="input filter-select" value={filters.bankName}
          onChange={e => setFilters({ ...filters, bankName: e.target.value })}>
          <option value="">All Banks</option>
          {savedBanks.map((bank, i) => (
            <option key={i} value={bank.bankName}>{bank.bankName}</option>
          ))}
        </select>

        {(filters.type || filters.bankName) && (
          <button className="btn btn-secondary"
            onClick={() => setFilters({ type: '', bankName: '' })}>
            Clear
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="card tx-table-card">
        {loading ? (
          <div className="empty-state"><span className="loading" /></div>
        ) : displayTxs.length === 0 ? (
          <div className="empty-state">No transactions found 💸</div>
        ) : (
          <table className="tx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Bank</th>
                <th>Description</th>
                <th>Category</th>
                <th>Payment</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayTxs.map((tx) => (
                <tr key={tx._id}>
                  <td className="tx-date">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td>
                    {tx.bankName
                      ? <div className="bank-cell">
                          <span>🏦</span>
                          <div>
                            <div className="bank-cell-name">{tx.bankName}</div>
                            {tx.accountNumber && (
                              <div className="bank-cell-acc">••••{tx.accountNumber.slice(-4)}</div>
                            )}
                          </div>
                        </div>
                      : '—'}
                  </td>
                  <td>{tx.description || '—'}</td>
                  <td><span className="cat-chip">{tx.category || '—'}</span></td>
                  <td>
                    {tx.paymentMethod
                      ? <span className="payment-method-chip">
                          {tx.paymentMethod.toUpperCase()}
                        </span>
                      : '—'}
                  </td>
                  <td><span className={`badge badge-${tx.type}`}>{tx.type}</span></td>
                  <td className={tx.type === 'income' ? 'amount-positive' : 'amount-negative'}>
                    {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                  </td>

                   <td className="running-balance">
                    ₹{getRunningBalance(tx).toLocaleString()}
                  </td>

                  <td className="tx-actions">
                    <button className="action-btn edit-btn" onClick={() => handleEdit(tx)}>✏️</button>
                    <button className="action-btn delete-btn" onClick={() => handleDelete(tx._id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal glass fade-in">
            <div className="modal-header">
              <h3>{editTx ? 'Edit Transaction' : 'New Transaction'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="type-toggle">
                {['expense', 'income'].map(t => (
                  <button type="button" key={t}
                    className={`type-btn ${form.type === t ? 'active-' + t : ''}`}
                    onClick={() => handleTypeChange(t)}>
                    {t === 'income' ? '📈 Income' : '📉 Expense'}
                  </button>
                ))}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input className="input" type="number" placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    required min="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input className="input" type="date"
                    value={form.date}
                    min={form.type === 'expense' ? expenseMinDate() : incomeMinDate()}
                    max={today()}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    required />
                </div>
              </div>

              {form.type === 'expense' && (
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
                      <option value="card">CARD</option>
                      <option value="upi">UPI</option>
                      <option value="netbanking">NETBANKING</option>
                      <option value="other">OTHER</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Bank</label>
                <select className="input" value={form.bankName}
                  onChange={(e) => {
                    const selected = savedBanks.find(b => b.bankName === e.target.value);
                    setForm({
                      ...form,
                      bankName: selected?.bankName || '',
                      accountNumber: selected?.accountNumber || ''
                    });
                  }}>
                  <option value="">Select Bank</option>
                  {savedBanks.map((bank, i) => (
                    <option key={i} value={bank.bankName}>
                      {bank.bankName} - xxxx{bank.accountNumber.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input className="input" type="text" placeholder="Optional note..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editTx ? '💾 Update' : '➕ Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}