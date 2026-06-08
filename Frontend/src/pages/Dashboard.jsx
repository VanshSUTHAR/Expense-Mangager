import { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  FaUtensils, FaCar, FaShoppingBag, FaHeartbeat, FaFilm,
  FaBriefcase, FaChartLine, FaHome, FaLightbulb, FaBook,
  FaCreditCard, FaUniversity, FaWallet, FaExclamationTriangle,
} from 'react-icons/fa';
import '../index.css';
import './Dashboard.css';

const LOW_BALANCE_THRESHOLD = 1000;
const COLORS = ['#f953c6', '#4facfe', '#43e97b', '#fee140', '#a18cd1', '#f77062'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
 const savedCards = JSON.parse(localStorage.getItem("cards")) || [];
 
const cardsWithLimit = savedCards.filter(
    (card) => Number(card.creditLimit) > 0,
  );

const EMI_STATUS_CONFIG = {
  Overdue: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', },
  'Due Today': { bg: '#fff7ed', border: '#fed7aa', color: '#92400e', },
  Pending: { bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1', },
  Paid: { bg: '#f0fdf4', border: '#bbf7d0', color: '#065f46', },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [debitCards, setDebitCards] = useState([]);
  const [creditCardBills, setCreditCardBills] = useState([]);
  const [upcomingEMIs, setUpcomingEMIs] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, txRes, bankRes, debitRes, emiRes] = await Promise.all([
        api.get('/transactions/stats'),
        api.get('/transactions?limit=5'),
        api.get('/bank-accounts'),
        api.get('/debit-cards'),
        api.get('/loans/upcoming-emis'),
      ]);
      setStats(statsRes.data);
      setTransactions(txRes.data.transactions);
      setBankAccounts(bankRes.data.accounts || []);
      setDebitCards(debitRes.data.cards || []);
      const emis = emiRes.data.emis || [];
      setUpcomingEMIs(emis);
    } finally {
      setLoading(false);
    }
  };

  const income = stats?.stats?.find(s => s._id === 'income')?.total || 0;
  const expense = stats?.stats?.find(s => s._id === 'expense')?.total || 0;
  const balance = income - expense;
  const trendData = processTrend(stats?.monthlyTrend || []);
  const budgetUsed = user?.monthlyBudget ? (expense / user.monthlyBudget * 100) : 0;

  if (loading) return (
    <div className="page-loading">
      <div className="loading" style={{ width: 40, height: 40 }} />
    </div>
  );

  const urgentEMIs = upcomingEMIs.filter(e => e.status === 'Overdue' || e.status === 'Due Today');
  const otherEMIs = upcomingEMIs.filter(e => e.status !== 'Overdue' && e.status !== 'Due Today');

const getCardLimitInfo = (card) => {
  const limit = Number(card.creditLimit) || 0;

  return {
    limit,
    used: 0,
    available: limit,
    usedPercent: 0,
  };
};

const getCardBill = () => null;

  return (
    <div className="dashboard fade-in">
      <div className="page-header">
        <div>
          <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]}!</h1>
          <p className="page-sub">Here's your financial overview</p>
        </div>
        <a href="/transactions" className="btn btn-primary">+ Add Transaction</a>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-balance">
          <div>
            <div className="stat-label">Net Balance</div>
            <div className={`stat-value ${balance >= 0 ? 'amount-positive' : 'amount-negative'}`}>
              ₹{Math.abs(balance).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="stat-card stat-income">
          <div>
            <div className="stat-label">This Month Income</div>
            <div className="stat-value amount-positive">₹{income.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card stat-expense">
          <div>
            <div className="stat-label">This Month Expense</div>
            <div className="stat-value amount-negative">₹{expense.toLocaleString()}</div>
          </div>
        </div>

      </div>

      {(bankAccounts.length > 0 || debitCards.length > 0) && (
        <div className="bank-debit-section">
          <div className="bank-debit-card">
            <h3><FaUniversity size={15} color="#6c8cff" /> Bank Accounts</h3>
            {bankAccounts.length === 0 ? (
              <div className="empty-bank-debit">No bank accounts added</div>
            ) : (
              <div className="bank-debit-list">
                {bankAccounts.map((acc) => {
                  const isLow = acc.balance < LOW_BALANCE_THRESHOLD;
                  return (
                    <div key={acc._id} className={`bank-debit-item ${isLow ? 'low-balance' : ''}`}>
                      <div className="bank-debit-icon"><FaUniversity size={16} color="#6c8cff" /></div>
                      <div className="bank-debit-info">
                        <div className="bank-debit-name">{acc.bankName}</div>
                        <div className="bank-debit-sub">••••{acc.accountNumber.slice(-4)}</div>
                        {isLow && <div className="low-balance-warning">⚠️ Low Balance</div>}
                      </div>
                      <div className={`bank-debit-balance ${isLow ? 'low' : 'ok'}`}>
                        ₹{Number(acc.balance).toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="bank-debit-card">
            <h3><FaWallet size={15} color="#10b981" /> Debit Cards</h3>
            {debitCards.length === 0 ? (
              <div className="empty-bank-debit">No debit cards linked</div>
            ) : (
              <div className="bank-debit-list">
                {debitCards.map((card) => {
                  const bal = card.linkedBankAccount?.balance ?? 0;
                  const isLow = bal < LOW_BALANCE_THRESHOLD;
                  return (
                    <div key={card._id} className={`bank-debit-item ${isLow ? 'low-balance' : ''}`}>
                      <div className="bank-debit-icon debit"><FaWallet size={16} color="#10b981" /></div>
                      <div className="bank-debit-info">
                        <div className="bank-debit-name">{card.cardName}</div>
                        <div className="bank-debit-sub">••••{card.cardNumber.slice(-4)} → {card.linkedBankAccount?.bankName}</div>
                        {isLow && <div className="low-balance-warning">⚠️ Low Balance</div>}
                      </div>
                      <div className={`bank-debit-balance ${isLow ? 'low' : 'ok'}`}>
                        ₹{Number(bal).toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="bank-debit-card">
            <h3><FaCreditCard size={15} color="#f59e0b" /> Credit Cards</h3>
            {cardsWithLimit.length > 0 && (
        <div className="card credit-limit-section">
          <h3 className="credit-limit-title">
            <FaCreditCard size={16} /> Credit Card Limits
          </h3>
          <div className="credit-limit-grid">
            {cardsWithLimit.map((card, i) => {
              const info = getCardLimitInfo(card);
              const cardBill = getCardBill(card);

              return (
                <div key={i} className="credit-limit-card">
                  <div className="credit-limit-card-header">
                    <div className="credit-limit-card-icon">
                      <FaCreditCard size={18} color="#6c8cff" />
                    </div>
                    <div className="credit-limit-card-info">
                      <div className="credit-limit-card-name">
                        {card.cardName}
                      </div>
                      <div className="credit-limit-card-num">
                        ••••{card.cardNumber.slice(-4)}
                      </div>
                    </div>
                    <div
                      className={`credit-limit-status ${info.usedPercent >= 90 ? "danger" : info.usedPercent >= 70 ? "warning" : "safe"}`}
                    >
                      {info.usedPercent >= 90
                        ? "Critical"
                        : info.usedPercent >= 70
                          ? " High"
                          : " Good"}
                    </div>
                  </div>

                  <div className="credit-limit-bar-wrap">
                    <div className="credit-limit-bar">
                      <div
                        className="credit-limit-bar-fill"
                        style={{
                          width: `${info.usedPercent}%`,
                          background:
                            info.usedPercent >= 90
                              ? "linear-gradient(90deg, #ef4444, #dc2626)"
                              : info.usedPercent >= 70
                                ? "linear-gradient(90deg, #f59e0b, #d97706)"
                                : "linear-gradient(90deg, #6c8cff, #8ea6ff)",
                        }}
                      />
                    </div>
                    <span className="credit-limit-pct">
                      {info.usedPercent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="credit-limit-amounts">
                    <div className="credit-limit-amt">
                      <span>Total Limit</span>
                      <strong>₹{info.limit.toLocaleString()}</strong>
                    </div>
                    <div className="credit-limit-amt">
                      <span>Used</span>
                      <strong style={{ color: "#dc2626" }}>
                        ₹{info.used.toLocaleString()}
                      </strong>
                    </div>
                    <div className="credit-limit-amt">
                      <span>Available</span>
                      <strong style={{ color: "#059669" }}>
                        ₹{info.available.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {cardBill && cardBill.status !== "Paid" && (
                    <div className="credit-limit-card-footer">
                      <button
                        type="button"
                        className="btn btn-secondary credit-bill-full-pay-btn"
                        onClick={() => handlePayBill(cardBill)}
                      >
                        Pay bill
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary credit-bill-full-pay-btn"
                        onClick={() => handlePayFullBill(cardBill)}
                      >
                        Full Payment
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

          </div>
        </div>
      )}

      {upcomingEMIs.length > 0 && (
        <div className="card upcoming-emis-card">
          <div className="section-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaExclamationTriangle size={16} color="#d97706" /> Upcoming EMIs
            </h3>
            <a href="/loans" className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>
              Manage Loans
            </a>
          </div>

          {urgentEMIs.length > 0 && (
            <div className="upcoming-emi-list urgent-emi-group">
              {urgentEMIs.map(emi => <EMIRow key={emi.loanId} emi={emi} />)}
            </div>
          )}

          {otherEMIs.length > 0 && (
            <div className="upcoming-emi-list">
              {otherEMIs.map(emi => <EMIRow key={emi.loanId} emi={emi} />)}
            </div>
          )}
        </div>
      )}

      <div className="charts-grid">
        <div className="card chart-card">
          <h3>6-Month Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#43e97b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#43e97b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f953c6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f953c6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#d1d5db" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis stroke="#d1d5db" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8 }} />
              <Area type="monotone" dataKey="income" stroke="#43e97b" fill="url(#incomeGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="#f953c6" fill="url(#expenseGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Spending by Category</h3>
          {stats?.categoryStats?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={stats.categoryStats} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="total" nameKey="_id" paddingAngle={3}>
                    {stats.categoryStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="category-legend">
                {stats.categoryStats.map((cat, i) => (
                  <div key={cat._id} className="legend-item">
                    <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                    <span>{cat._id}</span>
                    <span className="legend-amount">₹{cat.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">No expense data yet</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h3>Recent Transactions</h3>
          <a href="/transactions" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>View All</a>
        </div>
        {transactions.length === 0 ? (
          <div className="empty-state">No transactions yet. Add your first one! 💸</div>
        ) : (
          <div className="tx-list">
            {transactions.map(tx => (
              <div key={tx._id} className="tx-item">
                <div className="tx-icon">{getCategoryIcon(tx.category)}</div>
                <div className="tx-info">
                  <div className="tx-desc">{tx.description || tx.category}</div>
                  <div className="tx-meta">{tx.category} · {new Date(tx.date).toLocaleDateString()}</div>
                </div>
                <div className={`tx-amount ${tx.type === 'income' ? 'amount-positive' : 'amount-negative'}`}>
                  {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EMIRow({ emi }) {
  const cfg = EMI_STATUS_CONFIG[emi.status] || EMI_STATUS_CONFIG.Pending;
  const dueLabel =
    emi.status === 'Overdue' ? `${Math.abs(emi.daysRemaining)}d overdue` :
      emi.status === 'Due Today' ? 'Due Today!' :
        emi.status === 'Paid' ? 'Paid' :
          `${emi.daysRemaining}d left`;

  return (
    <div className="upcoming-emi-row" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <div className="emi-row-icon">{cfg.icon}</div>
      <div className="emi-row-info">
        <div className="emi-row-title">{emi.title}</div>
        <div className="emi-row-due">
          Due: {new Date(emi.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}{emi.paidEMIs}/{emi.totalEMIs} paid
        </div>
      </div>
      <div className="emi-row-right">
        <div className="emi-row-amount">₹{Number(emi.emiAmount).toLocaleString('en-IN')}</div>
        <div className="emi-row-days" style={{ color: cfg.color }}>{dueLabel}</div>
        <span className="emi-row-badge" style={{ background: cfg.border, color: cfg.color }}>{emi.status}</span>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function processTrend(data) {
  const map = {};
  data.forEach(({ _id, total }) => {
    const key = `${MONTHS[_id.month - 1]} ${_id.year}`;
    if (!map[key]) map[key] = { month: MONTHS[_id.month - 1], income: 0, expense: 0 };
    map[key][_id.type] = total;
  });
  return Object.values(map);
}

function getCategoryIcon(cat) {
  const icons = {
    food: <FaUtensils />, transport: <FaCar />, shopping: <FaShoppingBag />,
    health: <FaHeartbeat />, entertainment: <FaFilm />, salary: <FaBriefcase />,
    business: <FaChartLine />, rent: <FaHome />, utilities: <FaLightbulb />, education: <FaBook />,
  };
  return icons[cat?.toLowerCase()] || <FaCreditCard />;
}
