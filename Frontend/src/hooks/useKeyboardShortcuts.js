import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const SHORTCUTS = [
  { keys: ['N'], description: 'New transaction',       scope: 'Transactions page' },
  { keys: ['G', 'D'], description: 'Go to Dashboard',  scope: 'Global' },
  { keys: ['G', 'T'], description: 'Go to Transactions', scope: 'Global' },
  { keys: ['G', 'L'], description: 'Go to Loans',      scope: 'Global' },
  { keys: ['G', 'G'], description: 'Go to Goals',      scope: 'Global' },
  { keys: ['G', 'R'], description: 'Go to Reports',    scope: 'Global' },
  { keys: ['G', 'S'], description: 'Go to Settings',   scope: 'Global' },
  { keys: ['Esc'],    description: 'Close modal / dialog', scope: 'Global' },
  { keys: ['?'],      description: 'Show keyboard shortcuts', scope: 'Global' },
];

export function useKeyboardShortcuts({ onNewTransaction, onToggleShortcuts }) {
  const navigate = useNavigate();

  useEffect(() => {
    let gPressed = false;
    let gTimer = null;

    const handleKeyDown = (e) => {
       const tag = e.target.tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      if (isEditing) return;

       if (e.key === '?') {
        e.preventDefault();
        onToggleShortcuts?.();
        return;
      }

       if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNewTransaction?.();
        return;
      }

       if (e.key === 'g' || e.key === 'G') {
        gPressed = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 1500);
        return;
      }

      if (gPressed) {
        gPressed = false;
        clearTimeout(gTimer);
        const key = e.key.toLowerCase();
        const routes = { d: '/', t: '/transactions', l: '/loans', g: '/goals', r: '/reports', s: '/settings' };
        if (routes[key]) {
          e.preventDefault();
          navigate(routes[key]);
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(gTimer);
    };
  }, [navigate, onNewTransaction, onToggleShortcuts]);
}
