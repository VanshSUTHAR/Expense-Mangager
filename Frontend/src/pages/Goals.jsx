import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './Goals.css';

const ICONS = ['🎯', '🏠', '✈️', '🚗', '📱', '💍', '🎓', '💼', '🏋️', '🎮', '🌴', '💊'];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [form, setForm] = useState({ title: '', targetAmount: '', currentAmount: 0, deadline: '', icon: '🎯', color: '#6366f1', notes: '' });

  useEffect(() => { fetchGoals(); }, []);

  const fetchGoals = async () => {
    try {
      const { data } = await api.get('/goals');
      setGoals(data.goals);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/goals', form);
      toast.success('Goal created! 🎯');
      setShowModal(false);
      setForm({ title: '', targetAmount: '', currentAmount: 0, deadline: '', icon: '🎯', color: '#6366f1', notes: '' });
      fetchGoals();
    } catch (err) { toast.error('Error creating goal'); }
  };

  const handleAddFunds = async () => {
    try {
      await api.post(`/goals/${showFundModal}/add-funds`, { amount: fundAmount });
      toast.success('Funds added! 💰');
      setShowFundModal(null);
      setFundAmount('');
      fetchGoals();
    } catch (err) { toast.error('Error adding funds'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    await api.delete(`/goals/${id}`);
    toast.success('Goal deleted');
    fetchGoals();
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <div className="goals-page fade-in">
      <div className="page-header">
        <div>
          <h1>Goals 🎯</h1>
          <p className="page-sub">{activeGoals.length} active · {completedGoals.length} completed</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Goal</button>
      </div>

      {loading ? <div className="empty-state"><span className="loading" /></div> : (
        <>
          {activeGoals.length === 0 && completedGoals.length === 0 ? (
            <div className="card empty-state" style={{ padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
              <div>No goals yet. Set your first financial goal!</div>
            </div>
          ) : (
            <>
              {activeGoals.length > 0 && (
                <>
                  <h2 className="section-title">Active Goals</h2>
                  <div className="goals-grid">
                    {activeGoals.map(goal => <GoalCard key={goal._id} goal={goal} onFund={setShowFundModal} onDelete={handleDelete} />)}
                  </div>
                </>
              )}
              {completedGoals.length > 0 && (
                <>
                  <h2 className="section-title" style={{ marginTop: 32 }}>Completed 🏆</h2>
                  <div className="goals-grid">
                    {completedGoals.map(goal => <GoalCard key={goal._id} goal={goal} onFund={setShowFundModal} onDelete={handleDelete} completed />)}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal glass fade-in">
            <div className="modal-header">
              <h3>Create New Goal</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="icon-picker">
                {ICONS.map(icon => (
                  <button type="button" key={icon} className={`icon-btn ${form.icon === icon ? 'active' : ''}`} onClick={() => setForm({ ...form, icon })}>
                    {icon}
                  </button>
                ))}
              </div>
              <div className="form-group">
                <label>Goal Title</label>
                <input className="input" placeholder="e.g. Buy a car" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Target Amount (₹)</label>
                  <input className="input" type="number" placeholder="50000" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Starting Amount (₹)</label>
                  <input className="input" type="number" placeholder="0" value={form.currentAmount} onChange={e => setForm({ ...form, currentAmount: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Target Date</label>
                <input className="input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input className="input" placeholder="Optional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">🎯 Create Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Funds Modal */}
      {showFundModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowFundModal(null)}>
          <div className="modal glass fade-in" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>Add Funds 💰</h3>
              <button className="modal-close" onClick={() => setShowFundModal(null)}>✕</button>
            </div>
            <div className="form-group">
              <label>Amount (₹)</label>
              <input className="input" type="number" placeholder="Enter amount" value={fundAmount} onChange={e => setFundAmount(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowFundModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddFunds}>Add ₹{fundAmount || '0'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, onFund, onDelete, completed }) {
  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className={`goal-card card ${completed ? 'completed' : ''}`}>
      <div className="goal-header">
        <div className="goal-icon-wrap">{goal.icon}</div>
        <div className="goal-title-wrap">
          <div className="goal-title">{goal.title}</div>
          <div className="goal-deadline">{completed ? '✅ Completed!' : daysLeft > 0 ? `${daysLeft} days left` : 'Overdue!'}</div>
        </div>
        <button className="action-btn delete-btn" onClick={() => onDelete(goal._id)}>🗑️</button>
      </div>

      <div className="goal-amounts">
        <span className="amount-positive">₹{goal.currentAmount.toLocaleString()}</span>
        <span className="separator"> / </span>
        <span className="goal-target">₹{goal.targetAmount.toLocaleString()}</span>
      </div>

      <div className="goal-progress-wrap">
        <div className="goal-progress-bar">
          <div className="goal-progress-fill" style={{ width: `${progress}%`, background: completed ? 'var(--grad-3)' : 'var(--grad-1)' }} />
        </div>
        <span className="progress-pct">{progress.toFixed(0)}%</span>
      </div>

      {!completed && (
        <button className="btn btn-secondary add-funds-btn" onClick={() => onFund(goal._id)}>
          + Add Funds
        </button>
      )}
    </div>
  );
}
