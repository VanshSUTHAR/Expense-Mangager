import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { FaMoneyBillWave } from "react-icons/fa";
import {
  FaWallet,
  FaBullseye,
  FaChartPie,
  FaBell
} from 'react-icons/fa';



import "./Auth.css";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb orb-1" />
        <div className="auth-orb orb-2" />
        <div className="auth-orb orb-3" />
      </div>

      <div className="auth-container fade-in">
        

        <div className="auth-logo">
          <span className="logo-icon">
            <FaMoneyBillWave />
          </span>

          <span className="logo-text">ExpenseFlow</span>
        </div>

        <div className="auth-card glass">
          <h2>{isLogin ? "Welcome Back" : "Get Started"}</h2>
          <p className="auth-sub">
            {isLogin ? "Sign in to your account" : "Create your free account"}
          </p>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input
                className="input"
                type="concat123@gmail.com"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                className="input"
                type="123321"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button
              className="btn btn-primary auth-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="loading" />
              ) : isLogin ? (
                "Sign In"
              ) : (
                " Create Account"
              )}
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>

           
      <div className="auth-features">
  {[
    { icon: <FaWallet />, text: 'Track Expenses' },
    { icon: <FaBullseye />, text: 'Set Goals' },
    { icon: <FaChartPie />, text: 'Rich Analytics' },
    { icon: <FaBell />, text: 'Smart Alerts' },
  ].map((f, index) => (
    <span key={index} className="feature-pill">
      {f.icon} {f.text}
    </span>
  ))}
</div>
      
      </div>
    </div>
  );
}