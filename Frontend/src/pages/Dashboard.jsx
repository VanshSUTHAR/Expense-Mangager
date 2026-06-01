import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  FaUtensils,
  FaCar,
  FaShoppingBag,
  FaHeartbeat,
  FaFilm,
  FaBriefcase,
  FaChartLine,
  FaHome,
  FaLightbulb,
  FaBook,
  FaCreditCard,
} from 'react-icons/fa';
import './Dashboard.css';

const COLORS = ['#f953c6', '#4facfe', '#43e97b', '#fee140', '#a18cd1', '#f77062'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, txRes] = await Promise.all([
        api.get('/transactions/stats'),
        api.get('/transactions?limit=5')
      ]);
      setStats(statsRes.data);
      setTransactions(txRes.data.transactions);
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

  return (
    <div className="dashboard fade-in">
      <div className="page-header">
        <div>
          <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]}! </h1>
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
              <Tooltip contentStyle={{ background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }} />
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
                    {stats.categoryStats.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }} />
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
          <a href="/transactions" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>View All</a>
        </div>
        {transactions.length === 0 ? (
          <div className="empty-state">No transactions yet. Add your first one! 💸</div>
        ) : (
          <div className="tx-list">
            {transactions.map((tx) => (
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
    food: <FaUtensils />,
    transport: <FaCar />,
    shopping: <FaShoppingBag />,
    health: <FaHeartbeat />,
    entertainment: <FaFilm />,
    salary: <FaBriefcase />,
    business: <FaChartLine />,
    rent: <FaHome />,
    utilities: <FaLightbulb />,
    education: <FaBook />,
  };

  return icons[cat?.toLowerCase()] || <FaCreditCard />;
}