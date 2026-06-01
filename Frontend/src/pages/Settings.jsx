import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Settings.css";
import { IoSettingsOutline } from "react-icons/io5";
import { FaUniversity, FaPlus, FaCreditCard } from "react-icons/fa";

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [newBank, setNewBank] = useState({ bankName: "", accountNumber: "" });
  const [newCard, setNewCard] = useState({ cardName: "", cardNumber: "" });

  const [form, setForm] = useState({
    name: user?.name || "",
    currency: user?.currency || "INR",
    monthlyBudget: user?.monthlyBudget || "",
    selectedBank: user?.selectedBank || "",
    banks: JSON.parse(localStorage.getItem("banks")) || [],
    selectedCard: user?.selectedCard || "",
    cards: JSON.parse(localStorage.getItem("cards")) || [],
  });

  const handleAddBank = () => {
    if (!newBank.bankName || !newBank.accountNumber) return;
    const updatedBanks = [
      { bankName: newBank.bankName, accountNumber: newBank.accountNumber },
      ...form.banks,
    ];
    setForm({ ...form, banks: updatedBanks });
    localStorage.setItem("banks", JSON.stringify(updatedBanks));
    setNewBank({ bankName: "", accountNumber: "" });
  };

  const handleAddCard = () => {
    if (!newCard.cardName || !newCard.cardNumber) return;
    const updatedCards = [
      { cardName: newCard.cardName, cardNumber: newCard.cardNumber },
      ...form.cards,
    ];
    setForm({ ...form, cards: updatedCards });
    localStorage.setItem("cards", JSON.stringify(updatedCards));
    setNewCard({ cardName: "", cardNumber: "" });
  };

  const handleDeleteCard = (indexToDelete) => {
    const updatedCards = form.cards.filter((_, i) => i !== indexToDelete);
    const deletedCard = form.cards[indexToDelete]?.cardName;
    setForm({
      ...form,
      cards: updatedCards,
      selectedCard: form.selectedCard === deletedCard ? "" : form.selectedCard,
    });
    localStorage.setItem("cards", JSON.stringify(updatedCards));
    if (form.selectedCard === deletedCard) localStorage.removeItem("selectedCard");
  };

  const handleSelectCard = (cardName) => {
    setForm({ ...form, selectedCard: cardName });
    localStorage.setItem("selectedCard", cardName);
  };

  const handleDeleteBank = (indexToDelete) => {
    const updatedBanks = form.banks.filter((_, i) => i !== indexToDelete);
    const deletedBank = form.banks[indexToDelete]?.bankName;
    setForm({
      ...form,
      banks: updatedBanks,
      selectedBank: form.selectedBank === deletedBank ? "" : form.selectedBank,
    });
    localStorage.setItem("banks", JSON.stringify(updatedBanks));
    if (form.selectedBank === deletedBank) localStorage.removeItem("selectedBank");
  };

  const handleSelectBank = (bankName) => {
    setForm({ ...form, selectedBank: bankName });
    localStorage.setItem("selectedBank", bankName);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser({ ...form, monthlyBudget: Number(form.monthlyBudget) || 0 });
      localStorage.setItem("selectedBank", form.selectedBank);
      localStorage.setItem("banks", JSON.stringify(form.banks));
        localStorage.setItem("selectedCard", form.selectedCard);
        localStorage.setItem("cards", JSON.stringify(form.cards));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page fade-in">

      <div className="page-header">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <IoSettingsOutline size={34} color="#1b2559" />
            Settings
          </h1>
          <p className="page-sub">Manage your account preferences</p>
        </div>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className="settings-two-col">

        {/* LEFT — Profile */}
        <div className="card settings-card">
          <h3 className="settings-title">Profile Settings</h3>

          <form onSubmit={handleSave}>

            <div className="profile-top-section">
              <div className="profile-avatar-section">
                <div className="big-avatar">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="user-display-name">{user?.name}</div>
                  <div className="user-display-email">{user?.email}</div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Display Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Currency</label>
              <select
                className="input"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="INR">₹ INR - Indian Rupee</option>
                <option value="USD">$ USD - US Dollar</option>
                <option value="EUR">€ EUR - Euro</option>
                <option value="GBP">£ GBP - British Pound</option>
              </select>
            </div>

            <div className="form-group">
              <label>Monthly Budget (₹)</label>
              <input
                className="input"
                type="number"
                placeholder="e.g. 20000"
                value={form.monthlyBudget}
                onChange={(e) => setForm({ ...form, monthlyBudget: e.target.value })}
              />
             
            </div>

            <button
              className="btn btn-primary save-btn"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>

          </form>
        </div>

         <div className="card settings-card">
          <h3 className="settings-title">Bank Accounts</h3>

          {form.selectedBank && (
            <div className="active-bank-preview">
              <span>Active Bank:</span>
              <strong>🏦 {form.selectedBank}</strong>
            </div>
          )}

          <div className="added-banks-list">
            {form.banks.length === 0 && (
              <div className="no-banks">No banks added yet</div>
            )}
            {form.banks.map((bank, index) => (
              <div
                key={index}
                className={`bank-mini-card ${form.selectedBank === bank.bankName ? "active-bank" : ""}`}
                onClick={() => handleSelectBank(bank.bankName)}
              >
                <button
                  type="button"
                  className="delete-bank-btn"
                  onClick={(e) => { e.stopPropagation(); handleDeleteBank(index); }}
                >
                  ✕
                </button>

                <div className="bank-top">
                  <div className="bank-icon">
                    <FaUniversity size={20} color="#6c8cff" />
                  </div>
                  <div>
                    <div className="mini-bank-name">{bank.bankName}</div>
                    <div className="mini-bank-number">
                      ••••{bank.accountNumber.slice(-4)}
                    </div>
                  </div>
                </div>

                {form.selectedBank === bank.bankName && (
                  <div className="active-bank-tag">✓ Active Bank</div>
                )}
              </div>
            ))}
          </div>

          <div className="add-bank-box">
            <h4 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FaPlus size={12} /> Add New Bank
            </h4>
            <div className="form-row">
              <input
                className="input"
                type="text"
                placeholder="Bank Name"
                value={newBank.bankName}
                onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
              />
              <input
                className="input"
                type="text"
                placeholder="Account Number"
                value={newBank.accountNumber}
                onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary add-bank-btn"
              onClick={handleAddBank}
            >
              <FaPlus size={12} /> Add Bank
            </button>
          </div>

        </div>
        
        <div className="card settings-card">
          <h3 className="settings-title">Credit Cards</h3>

          {form.selectedCard && (
            <div className="active-bank-preview">
              <span>Active Card:</span>
              <strong>💳 {form.selectedCard}</strong>
            </div>
          )}

          <div className="added-banks-list">
            {form.cards.length === 0 && (
              <div className="no-banks">No cards added yet</div>
            )}
            {form.cards.map((card, index) => (
              <div
                key={index}
                className={`bank-mini-card ${form.selectedCard === card.cardName ? "active-bank" : ""}`}
                onClick={() => handleSelectCard(card.cardName)}
              >
                <button
                  type="button"
                  className="delete-bank-btn"
                  onClick={(e) => { e.stopPropagation(); handleDeleteCard(index); }}
                >
                  ✕
                </button>

                <div className="bank-top">
                  <div className="bank-icon">
                    <FaCreditCard size={20} color="#6c8cff" />
                  </div>
                  <div>
                    <div className="mini-bank-name">{card.cardName}</div>
                    <div className="mini-bank-number">
                      ••••{card.cardNumber.slice(-4)}
                    </div>
                  </div>
                </div>

                {form.selectedCard === card.cardName && (
                  <div className="active-bank-tag">✓ Active Card</div>
                )}
              </div>
            ))}
          </div>

          <div className="add-bank-box">
            <h4 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FaPlus size={12} /> Add New Card
            </h4>
            <div className="form-row">
              <input
                className="input"
                type="text"
                placeholder="Card Name (e.g., Visa)"
                value={newCard.cardName}
                onChange={(e) => setNewCard({ ...newCard, cardName: e.target.value })}
              />
              <input
                className="input"
                type="text"
                placeholder="Card Number"
                value={newCard.cardNumber}
                onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary add-bank-btn"
              onClick={handleAddCard}
            >
              <FaPlus size={12} /> Add Card
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}