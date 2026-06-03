import Navbar from './Navbar';
import EMIReminderBanner from '../EMIReminderBanner';
import './Layout.css';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Navbar />
      <EMIReminderBanner />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
