import { createPortal } from "react-dom";
import { SHORTCUTS } from "../hooks/useKeyboardShortcuts";

export default function ShortcutsModal({ onClose }) {
  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal glass fade-in shortcuts-modal">
        <div className="modal-header">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            ⌨️ Keyboard Shortcuts
          </h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="shortcuts-grid">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="shortcut-row">
              <div className="shortcut-keys">
                {s.keys.map((k, ki) => (
                  <span key={ki}>
                    <kbd className="kbd">{k}</kbd>
                    {ki < s.keys.length - 1 && (
                      <span className="kbd-then">then</span>
                    )}
                  </span>
                ))}
              </div>
              <div className="shortcut-desc">{s.description}</div>
              <div className="shortcut-scope">{s.scope}</div>
            </div>
          ))}
        </div>

        <p className="shortcuts-tip">
          Press <kbd className="kbd">?</kbd> anytime to open this panel
        </p>
      </div>
    </div>,
    document.body,
  );
}
