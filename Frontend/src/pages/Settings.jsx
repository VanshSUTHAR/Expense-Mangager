import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import toast from "react-hot-toast";
import { IoSettingsOutline } from "react-icons/io5";
import { FaUniversity, FaPlus, FaCreditCard, FaWallet, FaTrash, FaUser, FaCoins } from "react-icons/fa";
import { MdCreditCard } from "react-icons/md";

const LOW_BALANCE_THRESHOLD = 1000;

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || "",
    currency: user?.currency || "INR",
    monthlyBudget: user?.monthlyBudget || "",
  });

  const [bankAccounts, setBankAccounts] = useState([]);
  const [newBank, setNewBank] = useState({ bankName: "", accountNumber: "", balance: "" });
  const [bankLoading, setBankLoading] = useState(true);
  const [addingBank, setAddingBank] = useState(false);

  const [debitCards, setDebitCards] = useState([]);
  const [newDebitCard, setNewDebitCard] = useState({ cardName: "", cardNumber: "", linkedBankAccountId: "" });
  const [debitLoading, setDebitLoading] = useState(true);
  const [addingDebit, setAddingDebit] = useState(false);

  const [creditCards, setCreditCards] = useState(JSON.parse(localStorage.getItem("cards")) || []);
  const [newCreditCard, setNewCreditCard] = useState({
    cardName: "",
    cardNumber: "",
    creditLimit: "",
    cvv: "",
    expiryMonth: "",
    expiryYear: "",
  });
  const [selectedCard, setSelectedCard] = useState(localStorage.getItem("selectedCard") || "");
  const [addingCredit, setAddingCredit] = useState(false);

  // Track which card's CVV is visible
  const [revealedCvv, setRevealedCvv] = useState(null);

  useEffect(() => { fetchBankAccounts(); fetchDebitCards(); }, []);

  const fetchBankAccounts = async () => {
    try {
      const { data } = await api.get("/bank-accounts");
      setBankAccounts(data.accounts || []);
    } catch { toast.error("Failed to load bank accounts"); }
    finally { setBankLoading(false); }
  };

  const fetchDebitCards = async () => {
    try {
      const { data } = await api.get("/debit-cards");
      setDebitCards(data.cards || []);
    } catch { toast.error("Failed to load debit cards"); }
    finally { setDebitLoading(false); }
  };

  const handleAddBank = async () => {
    if (!newBank.bankName.trim() || !newBank.accountNumber.trim()) {
      toast.error("Bank name and account number are required");
      return;
    }
    setAddingBank(true);
    try {
      const { data } = await api.post("/bank-accounts", {
        bankName: newBank.bankName.trim(),
        accountNumber: newBank.accountNumber.trim(),
        balance: Number(newBank.balance) || 0,
      });
      setBankAccounts(prev => [data.account, ...prev]);
      setNewBank({ bankName: "", accountNumber: "", balance: "" });
      toast.success("Bank account added");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add bank account");
    } finally { setAddingBank(false); }
  };

  const handleDeleteBank = async (id) => {
    try {
      await api.delete(`/bank-accounts/${id}`);
      setBankAccounts(prev => prev.filter(b => b._id !== id));
      toast.success("Bank account removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleAddDebitCard = async () => {
    if (!newDebitCard.cardName.trim() || !newDebitCard.cardNumber.trim() || !newDebitCard.linkedBankAccountId) {
      toast.error("All fields including linked bank are required");
      return;
    }
    setAddingDebit(true);
    try {
      const { data } = await api.post("/debit-cards", {
        cardName: newDebitCard.cardName.trim(),
        cardNumber: newDebitCard.cardNumber.trim(),
        linkedBankAccountId: newDebitCard.linkedBankAccountId,
      });
      setDebitCards(prev => [data.card, ...prev]);
      setNewDebitCard({ cardName: "", cardNumber: "", linkedBankAccountId: "" });
      toast.success("Debit card linked");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to link debit card");
    } finally { setAddingDebit(false); }
  };

  const handleDeleteDebitCard = async (id) => {
    try {
      await api.delete(`/debit-cards/${id}`);
      setDebitCards(prev => prev.filter(c => c._id !== id));
      toast.success("Debit card removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleAddCreditCard = () => {
    if (!newCreditCard.cardName.trim() || !newCreditCard.cardNumber.trim()) {
      toast.error("Card name and number are required");
      return;
    }
    if (newCreditCard.expiryMonth && newCreditCard.expiryYear) {
      const now = new Date();
      const expiry = new Date(
        parseInt("20" + newCreditCard.expiryYear),
        parseInt(newCreditCard.expiryMonth) - 1,
        1
      );
      if (expiry < now) {
        toast.error("Card is already expired");
        return;
      }
    }
    const updated = [
      {
        cardName: newCreditCard.cardName.trim(),
        cardNumber: newCreditCard.cardNumber.trim(),
        creditLimit: Number(newCreditCard.creditLimit) || 0,
        cvv: newCreditCard.cvv.trim(),
        expiryMonth: newCreditCard.expiryMonth,
        expiryYear: newCreditCard.expiryYear,
      },
      ...creditCards,
    ];
    setCreditCards(updated);
    localStorage.setItem("cards", JSON.stringify(updated));
    setNewCreditCard({ cardName: "", cardNumber: "", creditLimit: "", cvv: "", expiryMonth: "", expiryYear: "" });
    toast.success("Credit card added");
  };

  const handleDeleteCreditCard = (i) => {
    const deleted = creditCards[i]?.cardName;
    const updated = creditCards.filter((_, idx) => idx !== i);
    setCreditCards(updated);
    localStorage.setItem("cards", JSON.stringify(updated));
    if (selectedCard === deleted) {
      setSelectedCard("");
      localStorage.removeItem("selectedCard");
    }
    toast.success("Credit card removed");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser({ ...form, monthlyBudget: Number(form.monthlyBudget) || 0 });
      toast.success("Profile saved");
    } finally { setSaving(false); }
  };

  // Generate month options
  const months = [
    "01", "02", "03", "04", "05", "06",
    "07", "08", "09", "10", "11", "12",
  ];

  // Generate year options: current year to +15
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) =>
    String(currentYear + i).slice(-2)
  );

  const isExpired = (card) => {
    if (!card.expiryMonth || !card.expiryYear) return false;
    const now = new Date();
    const expiry = new Date(
      parseInt("20" + card.expiryYear),
      parseInt(card.expiryMonth) - 1,
      1
    );
    return expiry < now;
  };

  const isExpiringSoon = (card) => {
    if (!card.expiryMonth || !card.expiryYear) return false;
    const now = new Date();
    const expiry = new Date(
      parseInt("20" + card.expiryYear),
      parseInt(card.expiryMonth) - 1,
      1
    );
    const diff = (expiry - now) / (1000 * 60 * 60 * 24 * 30);
    return diff >= 0 && diff <= 2;
  };

  return (
    <div className="settings-page fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IoSettingsOutline size={32} color="#1b2559" /> Settings
          </h1>
          <p className="page-sub">Manage your profile, accounts and cards</p>
        </div>
      </div>

      <div className="settings-layout-grid">

        {/* Profile */}
        <div className="settings-section-card">
          <div className="settings-section-header">
            <div className="settings-section-icon" style={{ background: "#eff6ff" }}>
              <FaUser size={16} color="#1d4ed8" />
            </div>
            <div>
              <div className="settings-section-title">Profile</div>
              <div className="settings-section-sub">Your personal details</div>
            </div>
          </div>

          <div className="settings-avatar-row">
            <div className="settings-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="settings-avatar-name">{user?.name}</div>
              <div className="settings-avatar-email">{user?.email}</div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Display Name</label>
              <input className="input" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select className="input" value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="INR">₹ INR – Indian Rupee</option>
                <option value="USD">$ USD – US Dollar</option>
                <option value="EUR">€ EUR – Euro</option>
                <option value="GBP">£ GBP – British Pound</option>
              </select>
            </div>
            <div className="form-group">
              <label>Monthly Budget (₹)</label>
              <input className="input" type="number" placeholder="e.g. 20000"
                value={form.monthlyBudget}
                onChange={e => setForm({ ...form, monthlyBudget: e.target.value })} />
            </div>
            <button className="btn btn-primary save-btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>

        <div className="settings-right-stack">

          {/* Bank Accounts */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-icon" style={{ background: "#eff6ff" }}>
                <FaUniversity size={16} color="#1d4ed8" />
              </div>
              <div>
                <div className="settings-section-title">Bank Accounts</div>
                <div className="settings-section-sub">Accounts with balance tracking</div>
              </div>
            </div>

            {bankLoading ? (
              <div className="settings-loading">Loading…</div>
            ) : bankAccounts.length === 0 ? (
              <div className="settings-empty">No bank accounts yet</div>
            ) : (
              <div className="settings-item-list">
                {bankAccounts.map(bank => {
                  const isLow = bank.balance < LOW_BALANCE_THRESHOLD;
                  return (
                    <div key={bank._id} className={`settings-item ${isLow ? "settings-item-warn" : ""}`}>
                      <div className="settings-item-icon" style={{ background: "#eff6ff" }}>
                        <FaUniversity size={14} color="#1d4ed8" />
                      </div>
                      <div className="settings-item-info">
                        <div className="settings-item-name">{bank.bankName}</div>
                        <div className="settings-item-sub">••••{bank.accountNumber.slice(-4)}</div>
                      </div>
                      <div className="settings-item-right">
                        <div className={`settings-balance ${isLow ? "balance-low" : "balance-ok"}`}>
                          ₹{Number(bank.balance).toLocaleString("en-IN")}
                        </div>
                        {isLow && <div className="settings-warn-tag">⚠️ Low</div>}
                      </div>
                      <button className="settings-delete-btn" onClick={() => handleDeleteBank(bank._id)} title="Remove">
                        <FaTrash size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="settings-add-form">
              <div className="settings-add-title"><FaPlus size={11} /> Add Bank Account</div>
              <div className="settings-form-grid-3">
                <div className="form-group">
                  <label>Bank Name</label>
                  <input className="input" placeholder="e.g. HDFC Bank"
                    value={newBank.bankName}
                    onChange={e => setNewBank({ ...newBank, bankName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input className="input" placeholder="e.g. 1234567890"
                    value={newBank.accountNumber}
                    onChange={e => setNewBank({ ...newBank, accountNumber: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Opening Balance (₹)</label>
                  <input className="input" type="number" placeholder="e.g. 50000"
                    value={newBank.balance}
                    onChange={e => setNewBank({ ...newBank, balance: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-secondary settings-add-btn" onClick={handleAddBank} disabled={addingBank}>
                <FaPlus size={11} /> {addingBank ? "Adding…" : "Add Bank Account"}
              </button>
            </div>
          </div>

          {/* Debit Cards */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-icon" style={{ background: "#ecfdf5" }}>
                <FaWallet size={16} color="#059669" />
              </div>
              <div>
                <div className="settings-section-title">Debit Cards</div>
                <div className="settings-section-sub">Each card is linked to a bank account</div>
              </div>
            </div>

            {debitLoading ? (
              <div className="settings-loading">Loading…</div>
            ) : debitCards.length === 0 ? (
              <div className="settings-empty">No debit cards linked yet</div>
            ) : (
              <div className="settings-item-list">
                {debitCards.map(card => {
                  const bal = card.linkedBankAccount?.balance ?? 0;
                  const isLow = bal < LOW_BALANCE_THRESHOLD;
                  return (
                    <div key={card._id} className={`settings-item ${isLow ? "settings-item-warn" : ""}`}>
                      <div className="settings-item-icon" style={{ background: "#ecfdf5" }}>
                        <MdCreditCard size={16} color="#059669" />
                      </div>
                      <div className="settings-item-info">
                        <div className="settings-item-name">{card.cardName}</div>
                        <div className="settings-item-sub">
                          ••••{card.cardNumber.slice(-4)}
                          <span className="settings-linked-tag">→ {card.linkedBankAccount?.bankName}</span>
                        </div>
                      </div>
                      <div className="settings-item-right">
                        <div className={`settings-balance ${isLow ? "balance-low" : "balance-ok"}`}>
                          ₹{Number(bal).toLocaleString("en-IN")}
                        </div>
                        {isLow && <div className="settings-warn-tag">⚠️ Low</div>}
                      </div>
                      <button className="settings-delete-btn" onClick={() => handleDeleteDebitCard(card._id)} title="Remove">
                        <FaTrash size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="settings-add-form">
              <div className="settings-add-title"><FaPlus size={11} /> Link Debit Card</div>
              {bankAccounts.length === 0 && (
                <p className="settings-warning-text">⚠️ Add a bank account first before linking a debit card.</p>
              )}
              <div className="settings-form-grid-3">
                <div className="form-group">
                  <label>Card Name</label>
                  <input className="input" placeholder="e.g. HDFC Debit"
                    value={newDebitCard.cardName}
                    onChange={e => setNewDebitCard({ ...newDebitCard, cardName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Card Number</label>
                  <input className="input" placeholder="e.g. 4111111111111111"
                    value={newDebitCard.cardNumber}
                    onChange={e => setNewDebitCard({ ...newDebitCard, cardNumber: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Linked Bank Account</label>
                  <select className="input" value={newDebitCard.linkedBankAccountId}
                    onChange={e => setNewDebitCard({ ...newDebitCard, linkedBankAccountId: e.target.value })}>
                    <option value="">Select account</option>
                    {bankAccounts.map(b => (
                      <option key={b._id} value={b._id}>
                        {b.bankName} ••••{b.accountNumber.slice(-4)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="btn btn-secondary settings-add-btn" onClick={handleAddDebitCard}
                disabled={addingDebit || bankAccounts.length === 0}>
                <FaPlus size={11} /> {addingDebit ? "Linking…" : "Link Debit Card"}
              </button>
            </div>
          </div>

          {/* Credit Cards */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-icon" style={{ background: "#faf5ff" }}>
                <FaCreditCard size={16} color="#7c3aed" />
              </div>
              <div>
                <div className="settings-section-title">Credit Cards</div>
                <div className="settings-section-sub">For tracking credit card bill statements</div>
              </div>
            </div>

            {creditCards.length === 0 ? (
              <div className="settings-empty">No credit cards added yet</div>
            ) : (
              <div className="settings-item-list">
                {creditCards.map((card, i) => {
                  const expired = isExpired(card);
                  const expiringSoon = isExpiringSoon(card);
                  return (
                    <div
                      key={i}
                      className={`settings-item settings-item-selectable ${selectedCard === card.cardName ? "settings-item-active" : ""} ${expired ? "settings-item-expired" : ""}`}
                      onClick={() => {
                        const next = selectedCard === card.cardName ? "" : card.cardName;
                        setSelectedCard(next);
                        next ? localStorage.setItem("selectedCard", next) : localStorage.removeItem("selectedCard");
                      }}
                    >
                      <div className="settings-item-icon" style={{ background: "#faf5ff" }}>
                        <FaCreditCard size={14} color="#7c3aed" />
                      </div>

                      <div className="settings-item-info">
                        <div className="settings-item-name">
                          {card.cardName}
                          {selectedCard === card.cardName && <span className="settings-active-chip">Active</span>}
                          {expired && <span className="settings-expired-chip">Expired</span>}
                          {!expired && expiringSoon && <span className="settings-expiring-chip">Expiring Soon</span>}
                        </div>
                        <div className="settings-item-sub">••••{card.cardNumber.slice(-4)}</div>

                        {/* Expiry + CVV row */}
                        <div className="cc-meta-row">
                          {(card.expiryMonth && card.expiryYear) && (
                            <span className={`cc-expiry-tag ${expired ? "expired" : expiringSoon ? "soon" : ""}`}>
                              📅 {card.expiryMonth}/{card.expiryYear}
                            </span>
                          )}
                          {card.cvv && (
                            <span
                              className="cc-cvv-tag"
                              onClick={e => {
                                e.stopPropagation();
                                setRevealedCvv(revealedCvv === i ? null : i);
                              }}
                              title="Click to reveal CVV"
                            >
                              🔒 CVV: {revealedCvv === i ? card.cvv : "•••"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="settings-item-right">
                        {card.creditLimit > 0 && (
                          <div className="settings-limit">Limit: ₹{Number(card.creditLimit).toLocaleString()}</div>
                        )}
                      </div>

                      <button
                        className="settings-delete-btn"
                        onClick={e => { e.stopPropagation(); handleDeleteCreditCard(i); }}
                        title="Remove"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Credit Card Form */}
            <div className="settings-add-form">
              <div className="settings-add-title"><FaPlus size={11} /> Add Credit Card</div>
              <div className="settings-form-grid-3">
                <div className="form-group">
                  <label>Card Name</label>
                  <input className="input" placeholder="e.g. Axis Visa"
                    value={newCreditCard.cardName}
                    onChange={e => setNewCreditCard({ ...newCreditCard, cardName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Card Number</label>
                  <input
                    className="input"
                    placeholder="e.g. 4111 1111 1111 1111"
                    maxLength={19}
                    value={newCreditCard.cardNumber}
                    onChange={e => {
                      // Auto-format with spaces every 4 digits
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                      const formatted = raw.replace(/(.{4})/g, "$1 ").trim();
                      setNewCreditCard({ ...newCreditCard, cardNumber: formatted });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Credit Limit (₹)</label>
                  <input className="input" type="number" placeholder="e.g. 100000"
                    value={newCreditCard.creditLimit}
                    onChange={e => setNewCreditCard({ ...newCreditCard, creditLimit: e.target.value })} />
                </div>
              </div>

              {/* Expiry + CVV row */}
              <div className="settings-form-grid-3 cc-extra-row">
                <div className="form-group">
                  <label>Expiry Month</label>
                  <select className="input" value={newCreditCard.expiryMonth}
                    onChange={e => setNewCreditCard({ ...newCreditCard, expiryMonth: e.target.value })}>
                    <option value="">MM</option>
                    {months.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Expiry Year</label>
                  <select className="input" value={newCreditCard.expiryYear}
                    onChange={e => setNewCreditCard({ ...newCreditCard, expiryYear: e.target.value })}>
                    <option value="">YY</option>
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>CVV</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="•••"
                    maxLength={4}
                    value={newCreditCard.cvv}
                    onChange={e => setNewCreditCard({ ...newCreditCard, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  />
                </div>
              </div>

              <button className="btn btn-secondary settings-add-btn" onClick={handleAddCreditCard}>
                <FaPlus size={11} /> Add Credit Card
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
