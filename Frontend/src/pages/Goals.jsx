import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import '../index.css';
import { FaCheckCircle } from 'react-icons/fa';


import { TbTargetArrow } from 'react-icons/tb';
import {
  FaTrophy,
  FaBullseye,
  FaHome,
  FaPlane,
  FaCar,
  FaMobileAlt,
  FaGem,
  FaGraduationCap,
  FaBriefcase,
  FaDumbbell,
  FaGamepad,
  FaUmbrellaBeach,
  FaBriefcaseMedical,
} from 'react-icons/fa';
import { FaDeleteLeft } from 'react-icons/fa6';

const ICONS = [
  { name: 'bullseye', icon: <FaBullseye /> },
  { name: 'home', icon: <FaHome /> },
  { name: 'plane', icon: <FaPlane /> },
  { name: 'car', icon: <FaCar /> },
  { name: 'mobile', icon: <FaMobileAlt /> },
  { name: 'gem', icon: <FaGem /> },
  { name: 'graduation', icon: <FaGraduationCap /> },
  { name: 'briefcase', icon: <FaBriefcase /> },
  { name: 'dumbbell', icon: <FaDumbbell /> },
  { name: 'gamepad', icon: <FaGamepad /> },
  { name: 'beach', icon: <FaUmbrellaBeach /> },
  { name: 'medical', icon: <FaBriefcaseMedical /> },
];

const getIcon = (name) => {
  switch (name) {
    case 'bullseye':
      return <FaBullseye />;
    case 'home':
      return <FaHome />;
    case 'plane':
      return <FaPlane />;
    case 'car':
      return <FaCar />;
    case 'mobile':
      return <FaMobileAlt />;
    case 'gem':
      return <FaGem />;
    case 'graduation':
      return <FaGraduationCap />;
    case 'briefcase':
      return <FaBriefcase />;
    case 'dumbbell':
      return <FaDumbbell />;
    case 'gamepad':
      return <FaGamepad />;
    case 'beach':
      return <FaUmbrellaBeach />;
    case 'medical':
      return <FaBriefcaseMedical />;
    default:
      return <FaBullseye />;
  }
};

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(null);
  const [fundAmount, setFundAmount] = useState('');

  const [form, setForm] = useState({
    title: '',
    targetAmount: '',
    currentAmount: 0,
    deadline: '',
    icon: 'bullseye',
    color: '#6366f1',
    notes: '',
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data } = await api.get('/goals');
      setGoals(data.goals || []);
    } catch (err) {
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        targetAmount: Number(form.targetAmount),
        currentAmount: Number(form.currentAmount),
      };

      await api.post('/goals', payload);

      toast.success('Goal created!');

      setShowModal(false);

      setForm({
        title: '',
        targetAmount: '',
        currentAmount: 0,
        deadline: '',
        icon: 'bullseye',
        color: '#6366f1',
        notes: '',
      });

      fetchGoals();
    } catch (err) {
      console.log(err.response?.data || err.message);
      toast.error('Error creating goal');
    }
  };

  const handleAddFunds = async () => {
    try {
      await api.post(`/goals/${showFundModal}/add-funds`, {
        amount: Number(fundAmount),
      });

      toast.success('Funds added! 💰');

      setShowFundModal(null);
      setFundAmount('');

      fetchGoals();
    } catch (err) {
      toast.error('Error adding funds');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;

    try {
      await api.delete(`/goals/${id}`);

      toast.success('Goal deleted');

      fetchGoals();
    } catch (err) {
      toast.error('Error deleting goal');
    }
  };

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  return (
    <div className="goals-page fade-in">
      <div className="page-header">
        <div>
          <h1
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <TbTargetArrow size={34} />
            Goals
          </h1>

          <p className="page-sub">
            {activeGoals.length} active · {completedGoals.length} completed
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          + New Goal
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <span className="loading" />
        </div>
      ) : (
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
                    {activeGoals.map((goal) => (
                      <GoalCard
                        key={goal._id}
                        goal={goal}
                        onFund={setShowFundModal}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </>
              )}

              {completedGoals.length > 0 && (
                <>
                  <h2
                    className="section-title"
                    style={{ marginTop: 32 }}
                  >
                    Completed <FaTrophy />
                  </h2>

                  <div className="goals-grid">
                    {completedGoals.map((goal) => (
                      <GoalCard
                        key={goal._id}
                        goal={goal}
                        onFund={setShowFundModal}
                        onDelete={handleDelete}
                        completed
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowModal(false)
          }
        >
          <div className="modal glass fade-in">
            <div className="modal-header">
              <h3>Create New Goal</h3>

              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="icon-picker">
                {ICONS.map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    className={`icon-btn ${
                      form.icon === item.name ? 'active' : ''
                    }`}
                    onClick={() =>
                      setForm({
                        ...form,
                        icon: item.name,
                      })
                    }
                  >
                    {item.icon}
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label>Goal Title</label>

                <input
                  className="input"
                  placeholder="e.g. Buy a car"
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Target Amount (₹)</label>

                  <input
                    className="input"
                    type="number"
                    placeholder="50000"
                    value={form.targetAmount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        targetAmount: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Starting Amount (₹)</label>

                  <input
                    className="input"
                    type="number"
                    placeholder="0"
                    value={form.currentAmount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        currentAmount: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Target Date</label>

                <input
                  className="input"
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      deadline: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes</label>

                <input
                  className="input"
                  placeholder="Optional notes..."
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes: e.target.value,
                    })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <FaBullseye />
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFundModal && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget &&
            setShowFundModal(null)
          }
        >
          <div
            className="modal glass fade-in"
            style={{ maxWidth: 380 }}
          >
            <div className="modal-header">
              <h3>Add Funds</h3>

              <button
                className="modal-close"
                onClick={() => setShowFundModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="form-group">
              <label>Amount (₹)</label>

              <input
                className="input"
                type="number"
                placeholder="Enter amount"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowFundModal(null)}
              >
                Cancel
              </button>

              <button
                className="btn btn-primary"
                onClick={handleAddFunds}
              >
                Add ₹{fundAmount || '0'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, onFund, onDelete, completed }) {
  const progress = Math.min(
    (goal.currentAmount / goal.targetAmount) * 100,
    100
  );

  const daysLeft = Math.ceil(
    (new Date(goal.deadline) - new Date()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className={`goal-card card ${completed ? 'completed' : ''}`}>
      <div className="goal-header">
        <div className="goal-icon-wrap">
          {getIcon(goal.icon)}
        </div>

        <div className="goal-title-wrap">
          <div className="goal-title">{goal.title}</div>

                    <div className="goal-deadline">
  {completed ? (
    <>
      <FaCheckCircle className="goal-complete-icon" />
      {' '}Completed!
    </>
  ) : daysLeft > 0 ? (
    `${daysLeft} days left`
  ) : (
    'Overdue!'
  )}
</div>
        </div>

        <button
          className="action-btn delete-btn"
          onClick={() => onDelete(goal._id)}
        >
          <FaDeleteLeft/>
        </button>
      </div>

      <div className="goal-amounts">
        <span className="amount-positive">
          ₹{goal.currentAmount.toLocaleString()}
        </span>

        <span className="separator"> / </span>

        <span className="goal-target">
          ₹{goal.targetAmount.toLocaleString()}
        </span>
      </div>

      <div className="goal-progress-wrap">
        <div className="goal-progress-bar">
          <div
            className="goal-progress-fill"
            style={{
              width: `${progress}%`,
              background: completed
                ? 'var(--grad-3)'
                : 'var(--grad-1)',
            }}
          />
        </div>

        <span className="progress-pct">
          {progress.toFixed(0)}%
        </span>
      </div>

      {!completed && (
        <button
          className="btn btn-secondary add-funds-btn"
          onClick={() => onFund(goal._id)}
        >
          + Add Funds
        </button>
      )}
    </div>
  );
}