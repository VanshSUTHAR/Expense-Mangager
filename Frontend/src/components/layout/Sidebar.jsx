// import { NavLink, useNavigate } from 'react-router-dom';
// import {
//   Bell,
//   CreditCard,
//   Home,
//   LogOut,
//   PieChart,
//   Settings,
//   Target,
//   Wallet,
// } from 'lucide-react';
// import { useAuth } from '../../context/AuthContext';
// import './Sidebar.css';

// const navItems = [
//   { to: '/', icon: Home, label: 'Dashboard' },
//   { to: '/transactions', icon: CreditCard, label: 'Transactions' },
//   { to: '/goals', icon: Target, label: 'Goals' },
//   { to: '/reports', icon: PieChart, label: 'Reports' },
//   { to: '/notifications', icon: Bell, label: 'Notifications' },
//   { to: '/settings', icon: Settings, label: 'Settings' },
// ];

// export default function Sidebar() {
//   const { user, logout } = useAuth();
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   return (
//     <aside className="sidebar glass">
//       <div className="sidebar-logo">
//         <span className="brand-mark"><Wallet size={18} /></span>
//         <span className="sidebar-brand">ExpenseFlow</span>
//       </div>

//       <nav className="sidebar-nav">
//         {navItems.map(({ to, icon: Icon, label }) => (
//           <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
//             <span className="nav-icon"><Icon size={18} /></span>
//             <span>{label}</span>
//           </NavLink>
//         ))}
//       </nav>

//       <div className="sidebar-footer">
//         <div className="user-info">
//           <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
//           <div>
//             <div className="user-name">{user?.name}</div>
//             <div className="user-email">{user?.email}</div>
//           </div>
//         </div>
//         <button className="logout-btn" onClick={handleLogout}>
//           <LogOut size={16} />
//           <span>Logout</span>
//         </button>
//       </div>
//     </aside>
//   );
// }
