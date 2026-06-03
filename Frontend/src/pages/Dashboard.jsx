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

const LOW_BALANCE_THRESHOLD = 1000;
const COLORS = ['#f953c6', '#4facfe', '#43e97b', '#fee140', '#a18cd1', '#f77062'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EMI_STATUS_CONFIG = {
  Overdue:    { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '🔴' },
  'Due Today':{ bg: '#fff7ed', border: '#fed7aa', color: '#92400e', icon: '⚡' },
  Pending:    { bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1', icon: '🕐' },
  Paid:       { bg: '#f0fdf4', border: '#bbf7d0', color: '#065f46', icon: '✅' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [debitCards, setDebitCards] = useState([]);
  const [upcomingEMIs, setUpcomingEMIs] = useState([]);
  const alertedRef = useRef(false);

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

      // Fire toast alerts once per session
      if (!alertedRef.current) {
        alertedRef.current = true;
        emis.forEach((emi) => {
          if (emi.status === 'Due Today') {
            setTimeout(() => toast.error(
              `EMI Due Today! ₹${Number(emi.emiAmount).toLocaleString('en-IN')} payment pending for "${emi.title}".`,
              { duration: 6000, style: { background: '#fef2f2', color: '#991b1b' } }
            ), 600);
          } else if (emi.status === 'Overdue') {
            setTimeout(() => toast.error(
              `Overdue EMI Alert! "${emi.title}" EMI was due on ${new Date(emi.nextDueDate).toLocaleDateString('en-IN')}.`,
              { duration: 7000, style: { background: '#fef2f2', color: '#991b1b' } }
            ), 1000);
          }
        });
      }
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
  const otherEMIs  = upcomingEMIs.filter(e => e.status !== 'Overdue' && e.status !== 'Due Today');

  return (
    <div className="dashboard fade-in">
      <div className="page-header">
        <div>
          <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]}!</h1>
          <p className="page-sub">Here's your financial overview</p>
        </div>
        <a href="/transactions" className="btn btn-primary">+ Add Transaction</a>
      </div>

      {/* ── Stats ── */}
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
        <div className="stat-card stat-budget">
          <div>
            <div className="stat-label">Budget Used</div>
            <div className="stat-value">{user?.monthlyBudget ? `${budgetUsed.toFixed(0)}%` : 'Not Set'}</div>
            {user?.monthlyBudget > 0 && (
              <div className="budget-bar">
                <div className="budget-fill" style={{ width: `${Math.min(budgetUsed, 100)}%`, background: budgetUsed > 80 ? 'var(--grad-6)' : 'var(--grad-3)' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bank Accounts & Debit Cards ── */}
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
        </div>
      )}

      {/* ── Upcoming EMIs ── */}
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

      {/* ── Charts ── */}
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

      {/* ── Recent Transactions ── */}
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

// ─── EMI Row Component ────────────────────────────────────────────────────────
function EMIRow({ emi }) {
  const cfg = EMI_STATUS_CONFIG[emi.status] || EMI_STATUS_CONFIG.Pending;
  const dueLabel =
    emi.status === 'Overdue'    ? `${Math.abs(emi.daysRemaining)}d overdue` :
    emi.status === 'Due Today'  ? 'Due Today!' :
    emi.status === 'Paid'       ? 'Paid' :
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
