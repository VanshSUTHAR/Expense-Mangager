import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../utils/api';
import './Reports.css';

const COLORS = ['#f953c6', '#4facfe', '#43e97b', '#fee140', '#a18cd1', '#f77062'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/transactions/stats').then(({ data }) => {
      setStats(data);
    }).finally(() => setLoading(false));
  }, []);

  const income = stats?.stats?.find(s => s._id === 'income')?.total || 0;
  const expense = stats?.stats?.find(s => s._id === 'expense')?.total || 0;
  const savingsRate = income > 0 ? (((income - expense) / income) * 100).toFixed(1) : 0;

  const trendData = processTrend(stats?.monthlyTrend || []);

  if (loading) return <div className="page-loading"><span className="loading" style={{ width: 40, height: 40 }} /></div>;

  return (
    <div className="reports-page fade-in">
      <div className="page-header">
        <div>
          <h1>Reports 📊</h1>
          <p className="page-sub">Your financial insights</p>
        </div>
      </div>

      <div className="report-summary">
        {[ 
          { label: 'Total Income', value: `₹${income.toLocaleString()}`, color: 'var(--green)' },
          { label: 'Total Expense', value: `₹${expense.toLocaleString()}`},
          { label: 'Net Savings', value: `₹${(income - expense).toLocaleString()}`},
          { label: 'Savings Rate', value: `${savingsRate}%`, color: 'var(--pink)' },
        ].map(item => (
          <div key={item.label} className="card summary-card">
            {item.icon && <span className="summary-icon">{item.icon}</span>}
            <div className="summary-label">{item.label}</div>
            <div className="summary-value" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card">
          <h3>Monthly Comparison</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData} barGap={4}>
              <XAxis dataKey="month" stroke="#d1d5db" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis stroke="#d1d5db" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }} />
              <Bar dataKey="income" fill="#43e97b" radius={[6, 6, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#f953c6" radius={[6, 6, 0, 0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Category Breakdown</h3>
          {stats?.categoryStats?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stats.categoryStats} cx="50%" cy="50%" outerRadius={100} dataKey="total" nameKey="_id" label={({ _id, percent }) => `${formatCategoryName(_id)} ${(percent * 100).toFixed(0)}%`}>
                  {stats.categoryStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }} formatter={(val) => `₹${val.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No expense data this month</div>
          )}
        </div>
      </div>
    </div>
  );
}

function processTrend(data) {
  const map = {};
  data.forEach(({ _id, total }) => {
    const key = `${MONTHS[_id.month - 1]}`;
    if (!map[key]) map[key] = { month: key, income: 0, expense: 0 };
    map[key][_id.type] = total;
  });
  return Object.values(map);
}

function formatCategoryName(name) {
  if (!name) return '';
  return name
    .split(/\s+/)
    .map(word => word ? word[0].toUpperCase() + word.slice(1) : word)
    .join(' ');
}
