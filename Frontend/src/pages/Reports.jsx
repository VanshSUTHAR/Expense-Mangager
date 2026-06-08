import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  FaArrowUp, FaArrowDown, FaWallet, FaPercent,
  FaChartBar, FaShoppingCart, FaFilePdf, FaFileExcel,
} from "react-icons/fa";
import { HiOutlineChartBar } from "react-icons/hi";
import { exportReportsPDF } from "../utils/exportData";
import * as XLSX from "xlsx";

const PALETTE = ["#6c8cff", "#f953c6", "#43e97b", "#fee140", "#a18cd1", "#f77062", "#4facfe", "#fd7c3c"];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : "";

// Custom tooltip for charts
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rpt-tooltip">
      {label && <div className="rpt-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="rpt-tooltip-row">
          <span className="rpt-tooltip-dot" style={{ background: p.color }} />
          <span>{p.name}</span>
          <strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Reports() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/transactions/stats")
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  const income  = stats?.stats?.find(s => s._id === "income")?.total  || 0;
  const expense = stats?.stats?.find(s => s._id === "expense")?.total || 0;
  const netSavings = income - expense;
  const savingsRate = income > 0 ? ((netSavings / income) * 100).toFixed(1) : 0;

  const trendData = processTrend(stats?.monthlyTrend || []);
  const categoryData = (stats?.categoryStats || []).slice(0, 8);
  const topCategories = [...categoryData].sort((a, b) => b.total - a.total);
  const totalSpend = topCategories.reduce((s, c) => s + c.total, 0);

  if (loading) return (
    <div className="page-loading">
      <span className="loading" style={{ width: 40, height: 40 }} />
    </div>
  );

  const summaryCards = [
    { label: "Total Income",   value: fmt(income),      color: "#047857", bg: "#ecfdf5", icon: <FaArrowUp />,   sub: "This month" },
    { label: "Total Expense",  value: fmt(expense),     color: "#b91c1c", bg: "#fef2f2", icon: <FaArrowDown />, sub: "This month" },
    { label: "Net Savings",    value: fmt(netSavings),  color: netSavings >= 0 ? "#1d4ed8" : "#b91c1c", bg: netSavings >= 0 ? "#eff6ff" : "#fef2f2", icon: <FaWallet />, sub: "Income − Expense" },
    { label: "Savings Rate",   value: `${savingsRate}%`, color: "#7c3aed", bg: "#faf5ff", icon: <FaPercent />, sub: "Of total income" },
  ];

  return (
    <div className="reports-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <HiOutlineChartBar size={32} color="#1b2559" /> Reports
          </h1>
          <p className="page-sub">Your financial insights at a glance</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary export-btn"
            onClick={() => {
              exportReportsPDF({ income, expense, savingsRate, categoryStats: stats?.categoryStats, trendData, userName: user?.name });
              toast.success("PDF exported!");
            }}>
            <FaFilePdf size={14} color="#dc2626" /> Download PDF
          </button>
          <button className="btn btn-secondary export-btn"
            onClick={() => {
              const wb = XLSX.utils.book_new();
              const summary = XLSX.utils.aoa_to_sheet([
                ['Metric', 'Value'],
                ['Total Income', income],
                ['Total Expense', expense],
                ['Net Savings', income - expense],
                ['Savings Rate', `${savingsRate}%`],
              ]);
              XLSX.utils.book_append_sheet(wb, summary, 'Summary');
              if (stats?.categoryStats?.length) {
                const cats = XLSX.utils.json_to_sheet(stats.categoryStats.map(c => ({ Category: c._id, Amount: c.total })));
                XLSX.utils.book_append_sheet(wb, cats, 'Categories');
              }
              if (trendData.length) {
                const trend = XLSX.utils.json_to_sheet(trendData);
                XLSX.utils.book_append_sheet(wb, trend, 'Monthly Trend');
              }
              XLSX.writeFile(wb, `ExpenseFlow-Report-${new Date().toISOString().split('T')[0]}.xlsx`);
              toast.success("Excel exported!");
            }}>
            <FaFileExcel size={14} color="#16a34a" /> Download Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="rpt-summary-grid">
        {summaryCards.map(card => (
          <div key={card.label} className="rpt-stat-card">
            <div className="rpt-stat-icon" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div className="rpt-stat-body">
              <div className="rpt-stat-label">{card.label}</div>
              <div className="rpt-stat-value" style={{ color: card.color }}>{card.value}</div>
              <div className="rpt-stat-sub">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Bar Chart — full width */}
      <div className="card rpt-chart-card">
        <div className="rpt-chart-header">
          <div>
            <div className="rpt-chart-title"><FaChartBar size={14} /> Monthly Comparison</div>
            <div className="rpt-chart-sub">Income vs Expense over last 6 months</div>
          </div>
          <div className="rpt-legend">
            <span className="rpt-legend-dot" style={{ background: "#43e97b" }} />Income
            <span className="rpt-legend-dot" style={{ background: "#f953c6", marginLeft: 14 }} />Expense
          </div>
        </div>
        {trendData.length === 0 ? (
          <div className="empty-state">No transaction data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f9fafb" }} />
              <Bar dataKey="income"  fill="#43e97b" radius={[6,6,0,0]} name="Income" />
              <Bar dataKey="expense" fill="#f953c6" radius={[6,6,0,0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

       <div className="rpt-bottom-grid">

         <div className="card rpt-chart-card">
          <div className="rpt-chart-header">
            <div>
              <div className="rpt-chart-title">Spending by Category</div>
              <div className="rpt-chart-sub">This month's breakdown</div>
            </div>
          </div>
          {categoryData.length === 0 ? (
            <div className="empty-state">No expense data this month</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={95}
                    dataKey="total" nameKey="_id" paddingAngle={3}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Donut legend */}
              <div className="rpt-donut-legend">
                {categoryData.map((cat, i) => (
                  <div key={cat._id} className="rpt-donut-legend-item">
                    <span className="rpt-legend-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="rpt-donut-cat">{cap(cat._id)}</span>
                    <span className="rpt-donut-amt">{fmt(cat.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

         <div className="card rpt-chart-card">
          <div className="rpt-chart-header">
            <div>
              <div className="rpt-chart-title"><FaShoppingCart size={13} /> Top Spending Categories</div>
              <div className="rpt-chart-sub">Share of total spend this month</div>
            </div>
          </div>
          {topCategories.length === 0 ? (
            <div className="empty-state">No expense data this month</div>
          ) : (
            <div className="rpt-category-list">
              {topCategories.map((cat, i) => {
                const pct = totalSpend > 0 ? (cat.total / totalSpend) * 100 : 0;
                return (
                  <div key={cat._id} className="rpt-cat-row">
                    <div className="rpt-cat-top">
                      <div className="rpt-cat-name">
                        <span className="rpt-cat-rank" style={{ background: PALETTE[i % PALETTE.length] }}>{i + 1}</span>
                        {cap(cat._id)}
                      </div>
                      <div className="rpt-cat-meta">
                        <span className="rpt-cat-amt">{fmt(cat.total)}</span>
                        <span className="rpt-cat-pct">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="rpt-cat-bar-bg">
                      <div className="rpt-cat-bar-fill"
                        style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
                    </div>
                  </div>
                );
              })}
              <div className="rpt-total-row">
                <span>Total Spend</span>
                <strong>{fmt(totalSpend)}</strong>
              </div>
            </div>
          )}
        </div>

      </div>

       {income > 0 && (
        <div className="card rpt-savings-card">
          <div className="rpt-chart-header">
            <div>
              <div className="rpt-chart-title">Savings Health</div>
              <div className="rpt-chart-sub">
                You saved {fmt(netSavings)} out of {fmt(income)} earned this month
              </div>
            </div>
            <div className="rpt-savings-rate-badge"
              style={{ background: Number(savingsRate) >= 20 ? "#ecfdf5" : Number(savingsRate) >= 10 ? "#fff7ed" : "#fef2f2",
                       color:      Number(savingsRate) >= 20 ? "#047857" : Number(savingsRate) >= 10 ? "#92400e" : "#b91c1c" }}>
              {savingsRate}% saved
            </div>
          </div>
          <div className="rpt-savings-bar-bg">
            <div className="rpt-savings-bar-fill"
              style={{
                width: `${Math.min(Math.max(Number(savingsRate), 0), 100)}%`,
                background: Number(savingsRate) >= 20
                  ? "linear-gradient(90deg,#43e97b,#38f9d7)"
                  : Number(savingsRate) >= 10
                  ? "linear-gradient(90deg,#f6d365,#fda085)"
                  : "linear-gradient(90deg,#f953c6,#f77062)",
              }} />
          </div>
          <div className="rpt-savings-ticks">
            {[0, 10, 20, 30, 50, 75, 100].map(t => (
              <span key={t} style={{ left: `${t}%` }} className="rpt-savings-tick">{t}%</span>
            ))}
          </div>
          <div className="rpt-savings-guide">
            <span style={{ color: "#b91c1c" }}>⚠ &lt;10% — Tight</span>
            <span style={{ color: "#92400e" }}>⚡ 10–20% — Moderate</span>
            <span style={{ color: "#047857" }}>✅ &gt;20% — Healthy</span>
          </div>
        </div>
      )}

    </div>
  );
}

function processTrend(data) {
  const map = {};
  data.forEach(({ _id, total }) => {
    const key = MONTHS[_id.month - 1];
    if (!map[key]) map[key] = { month: key, income: 0, expense: 0 };
    map[key][_id.type] = total;
  });
  return Object.values(map);
}
