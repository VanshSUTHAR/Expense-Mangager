import { useState } from 'react';
import Navbar from './Navbar';
import EMIReminderBanner from '../EMIReminderBanner';
import ShortcutsModal from '../ShortcutsModal';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import './Layout.css';

export default function Layout({ children }) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useKeyboardShortcuts({
    onToggleShortcuts: () => setShowShortcuts(s => !s),
  });

  return (
    <div className="layout">
      <Navbar />
      <EMIReminderBanner />
      <main className="main-content">
        {children}
      </main>
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
