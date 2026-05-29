import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

export default function Settings() {

  const { user, updateUser } = useAuth();

  const [saving, setSaving] = useState(false);

  const [newBank, setNewBank] = useState({
    bankName: '',
    accountNumber: ''
  });

  const [form, setForm] = useState({

    name: user?.name || '',

    currency: user?.currency || 'INR',

    selectedBank: localStorage.getItem('selectedBank') || user?.selectedBank || '',

    banks: JSON.parse(
      localStorage.getItem('banks')
    ) || []

  });

  useEffect(() => {
    setForm({
      name: user?.name || '',
      currency: user?.currency || 'INR',
      selectedBank: localStorage.getItem('selectedBank') || user?.selectedBank || '',
      banks: JSON.parse(localStorage.getItem('banks')) || []
    });
  }, [user]);

  /* =========================
     ADD BANK
  ========================= */

  const handleAddBank = () => {

    if (
      !newBank.bankName ||
      !newBank.accountNumber
    ) {
      return;
    }

    const updatedBanks = [

      {
        bankName: newBank.bankName,
        accountNumber: newBank.accountNumber
      },

      ...form.banks

    ];

    setForm({

      ...form,

      banks: updatedBanks

    });

    localStorage.setItem(
      'banks',
      JSON.stringify(updatedBanks)
    );

    setNewBank({
      bankName: '',
      accountNumber: ''
    });

  };

  /* =========================
     DELETE BANK
  ========================= */

  const handleDeleteBank = (indexToDelete) => {

    const updatedBanks = form.banks.filter(
      (_, index) => index !== indexToDelete
    );

    const deletedBank =
      form.banks[indexToDelete]?.bankName;

    setForm({

      ...form,

      banks: updatedBanks,

      selectedBank:
        form.selectedBank === deletedBank
          ? ''
          : form.selectedBank

    });

    localStorage.setItem(
      'banks',
      JSON.stringify(updatedBanks)
    );

    if (form.selectedBank === deletedBank) {

      localStorage.removeItem(
        'selectedBank'
      );

    }

  };

  /* =========================
     SELECT BANK
  ========================= */

  const handleSelectBank = (bankName) => {

    setForm({
      ...form,
      selectedBank: bankName
    });

    localStorage.setItem(
      'selectedBank',
      bankName
    );

  };

  /* =========================
     SAVE
  ========================= */

  const handleSave = async (e) => {

    e.preventDefault();

    setSaving(true);

    try {

      await updateUser(form);

      localStorage.setItem(
        'selectedBank',
        form.selectedBank
      );

      localStorage.setItem(
        'banks',
        JSON.stringify(form.banks)
      );

    } finally {

      setSaving(false);

    }
  };

  return (

    <div className="settings-page fade-in">

      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>
            Settings ⚙️
          </h1>

          <p className="page-sub">
            Manage your account preferences
          </p>

        </div>

      </div>

      {/* GRID */}

      <div className="settings-grid">

        {/* SETTINGS CARD */}

        <div className="card settings-card">

          <h3 className="settings-title">
            Profile Settings
          </h3>

          <form onSubmit={handleSave}>

            {/* PROFILE */}

            <div className="profile-top-section">

              <div className="profile-avatar-section">

                <div className="big-avatar">

                  {user?.name?.[0]?.toUpperCase()}

                </div>

                <div>

                  <div className="user-display-name">

                    {user?.name}

                  </div>

                  <div className="user-display-email">

                    {user?.email}

                  </div>

                </div>

              </div>

            </div>

            {/* DISPLAY NAME */}

            <div className="form-group">

              <label>
                Display Name
              </label>

              <input
                className="input"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value
                  })
                }
              />

            </div>

            {/* CURRENCY */}

            <div className="form-group">

              <label>
                Currency
              </label>

              <select
                className="input"
                value={form.currency}
                onChange={(e) =>
                  setForm({
                    ...form,
                    currency: e.target.value
                  })
                }
              >

                <option value="INR">
                  ₹ INR - Indian Rupee
                </option>

                <option value="USD">
                  $ USD - US Dollar
                </option>

                <option value="EUR">
                  € EUR - Euro
                </option>

                <option value="GBP">
                  £ GBP - British Pound
                </option>

              </select>

            </div>

            {/* ACTIVE BANK */}

            {form.selectedBank && (

              <div className="active-bank-preview">

                <span>
                  Active Bank:
                </span>

                <strong>
                  🏦 {form.selectedBank}
                </strong>

              </div>

            )}

            {/* BANK CARDS */}

            <div className="added-banks-list">

              {form.banks.map((bank, index) => (

                <div
                  key={index}

                  className={`bank-mini-card ${
                    form.selectedBank === bank.bankName
                      ? 'active-bank'
                      : ''
                  }`}

                  onClick={() =>
                    handleSelectBank(bank.bankName)
                  }
                >

                  {/* DELETE */}

                  <button
                    type="button"
                    className="delete-bank-btn"

                    onClick={(e) => {

                      e.stopPropagation();

                      handleDeleteBank(index);

                    }}
                  >
                    ✕
                  </button>

                  {/* BANK */}

                  <div className="bank-top">

                    <div className="bank-icon">
                      🏦
                    </div>

                    <div>

                      <div className="mini-bank-name">

                        {bank.bankName}

                      </div>

                      <div className="mini-bank-number">

                        ••••
                        {bank.accountNumber.slice(-4)}

                      </div>

                    </div>

                  </div>

                  {/* ACTIVE */}

                  {form.selectedBank === bank.bankName && (

                    <div className="active-bank-tag">

                      ✓ Active Bank

                    </div>

                  )}

                </div>

              ))}

            </div>

            {/* ADD BANK */}

            <div className="add-bank-box">

              <h4>
                ➕ Add New Bank
              </h4>

              <div className="form-row">

                <input
                  className="input"
                  type="text"
                  placeholder="Bank Name"

                  value={newBank.bankName}

                  onChange={(e) =>
                    setNewBank({
                      ...newBank,
                      bankName: e.target.value
                    })
                  }
                />

                <input
                  className="input"
                  type="text"
                  placeholder="Account Number"

                  value={newBank.accountNumber}

                  onChange={(e) =>
                    setNewBank({
                      ...newBank,
                      accountNumber: e.target.value
                    })
                  }
                />

              </div>

              <button
                type="button"
                className="btn btn-secondary add-bank-btn"
                onClick={handleAddBank}
              >

                + Add Bank

              </button>

            </div>

            {/* SAVE */}

            <button
              className="btn btn-primary save-btn"
              type="submit"
              disabled={saving}
            >

              {saving
                ? 'Saving...'
                : '💾 Save Changes'
              }

            </button>

          </form>

        </div>

      </div>

    </div>
  );
}