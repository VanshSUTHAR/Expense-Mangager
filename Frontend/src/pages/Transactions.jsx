import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import api from "../utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
  FaCreditCard,
  FaEdit,
  FaTrash,
  FaWallet,
  FaFilePdf,
  FaFileExcel,
} from "react-icons/fa";
import { FaArrowTrendUp, FaArrowTrendDown } from "react-icons/fa6";
import { FaSave, FaPlus } from "react-icons/fa";
import "./Transactions.css";
import { TbTransfer } from "react-icons/tb";
import {
  exportTransactionsPDF,
  exportTransactionsExcel,
} from "../utils/exportData";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

const CATEGORIES = {
  expense: [
    "Food",
    "Transport",
    "Shopping",
    "Health",
    "Entertainment",
    "Rent",
    "Utilities",
    "Education",
    "Other",
  ],
};

const today = () => new Date().toISOString().split("T")[0];

const expenseMinDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().split("T")[0];
};

const incomeMinDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().split("T")[0];
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);

  const [editTx, setEditTx] = useState(null);
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [emiBillTarget, setEmiBillTarget] = useState(null);
  const [emiMonths, setEmiMonths] = useState(6);
  const [showAllPaidBills, setShowAllPaidBills] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [debitCards, setDebitCards] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedDebitCardId, setSelectedDebitCardId] = useState("");
  const [debitCardBalance, setDebitCardBalance] = useState(null);
  const [incomeBankAccountId, setIncomeBankAccountId] = useState("");
  const [directBankAccountId, setDirectBankAccountId] = useState("");
  const [paymentMethodType, setPaymentMethodType] = useState("bank"); // "bank" | "debit" | "credit"

  useEffect(() => {
    if (showModal || emiBillTarget) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showModal, emiBillTarget]);

  const savedBanks = JSON.parse(localStorage.getItem("banks")) || [];
  const savedCards = JSON.parse(localStorage.getItem("cards")) || [];
  const currentBank = savedBanks.find(
    (b) => b.bankName === localStorage.getItem("selectedBank"),
  );
  const currentCard = savedCards.find(
    (c) => c.cardName === localStorage.getItem("selectedCard"),
  );
  const defaultExpenseSource = currentCard
    ? { name: currentCard.cardName, number: currentCard.cardNumber }
    : {
        name: currentBank?.bankName || "",
        number: currentBank?.accountNumber || "",
      };

  const [filters, setFilters] = useState({ type: "", bankName: "" });

  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    category: "",
    description: "",
    date: today(),
    paymentMethod: currentCard ? "credit_card" : "card",
    bankName: defaultExpenseSource.name,
    accountNumber: defaultExpenseSource.number,
  });

  useEffect(() => {
    fetchAllTransactions();
    fetchCreditCardBills();
    fetchDebitCards();
    fetchBankAccounts();
  }, []);
  useEffect(() => {
    applyFilters();
  }, [filters, allTransactions]);

  const fetchAllTransactions = async () => {
    try {
      const { data } = await api.get("/transactions?limit=1000");
      const sorted = (data.transactions || []).sort(
        (a, b) =>
          new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date),
      );
      setAllTransactions(sorted);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to fetch transactions",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditCardBills = async () => {
    try {
      const { data } = await api.get("/credit-card-bills");
      setBills(data.bills || []);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to fetch credit card bills",
      );
    } finally {
      setBillsLoading(false);
    }
  };

  const fetchDebitCards = async () => {
    try {
      const { data } = await api.get("/debit-cards");
      setDebitCards(data.cards || []);
    } catch {
      // non-critical
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data } = await api.get("/bank-accounts");
      setBankAccounts(data.accounts || []);
    } catch {
     }
  };

  const switchPaymentType = (type) => {
    setPaymentMethodType(type);
    setDirectBankAccountId("");
    setSelectedDebitCardId("");
    setDebitCardBalance(null);
    setForm((prev) => ({
      ...prev,
      bankName: "",
      accountNumber: "",
      paymentMethod:
        type === "credit"
          ? "credit_card"
          : type === "debit"
            ? "debit_card"
            : "bank",
    }));
  };

  const handleDebitCardSelect = async (cardId) => {
    setSelectedDebitCardId(cardId);
    setDebitCardBalance(null);
    if (!cardId) return;
    try {
      const { data } = await api.get(`/debit-cards/${cardId}/balance`);
      setDebitCardBalance(data);
      const card = debitCards.find((c) => c._id === cardId);
      setForm((prev) => ({
        ...prev,
        paymentMethod: "debit_card",
        bankName: data.bankName,
        accountNumber: data.accountNumber,
      }));
    } catch {
      toast.error("Failed to fetch card balance");
    }
  };

  const applyFilters = () => {
    let filtered = [...allTransactions];
    if (filters.type === "loan_emi") {
      filtered = filtered.filter(
        (tx) => tx.isLoanEMI || tx.category === "loan_emi",
      );
    } else if (filters.type) {
      filtered = filtered.filter((tx) => tx.type === filters.type);
    }
    if (filters.bankName)
      filtered = filtered.filter((tx) => tx.bankName === filters.bankName);
    setTransactions(filtered);
  };

  const calculateTotalBalance = () => {
    const source = filters.bankName
      ? allTransactions.filter((tx) => tx.bankName === filters.bankName)
      : allTransactions;
    return source.reduce((total, tx) => {
      const amount = Number(tx.amount) || 0;
      return tx.type === "income" ? total + amount : total - amount;
    }, 0);
  };

  const calculateIncome = () => {
    const source = filters.bankName
      ? allTransactions.filter((tx) => tx.bankName === filters.bankName)
      : allTransactions;
    return source
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  };

  const calculateExpense = () => {
    const source = filters.bankName
      ? allTransactions.filter((tx) => tx.bankName === filters.bankName)
      : allTransactions;
    return source
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  };

  const getRunningBalance = (tx) => {
    const bankTxs = filters.bankName
      ? allTransactions.filter((t) => t.bankName === filters.bankName)
      : allTransactions;
    const sorted = [...bankTxs].sort(
      (a, b) =>
        new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date),
    );
    let balance = 0;
    for (const t of sorted) {
      const amount = Number(t.amount) || 0;
      if (t.type === "income") balance += amount;
      else balance -= amount;
      if (t._id === tx._id) break;
    }
    return balance;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.type === "expense" && !form.category) {
        toast.error("Please select category");
        return;
      }

      // Frontend debit card balance check
      if (
        form.type === "expense" &&
        selectedDebitCardId &&
        debitCardBalance !== null
      ) {
        const txAmount = Number(form.amount);
        if (txAmount > debitCardBalance.balance) {
          toast.error(
            `Insufficient Balance. Your account contains only ₹${Number(debitCardBalance.balance).toLocaleString("en-IN")}.`,
          );
          return;
        }
      }

       if (
        form.type === "expense" &&
        directBankAccountId &&
        !selectedDebitCardId
      ) {
        const acc = bankAccounts.find((b) => b._id === directBankAccountId);
        if (acc && Number(form.amount) > acc.balance) {
          toast.error(
            `Insufficient Balance. ${acc.bankName} contains only ₹${Number(acc.balance).toLocaleString("en-IN")}.`,
          );
          return;
        }
      }

      const payload = {
        ...form,
        amount: Number(form.amount),
        category: form.type === "income" ? "income" : form.category,
        paymentMethod: form.type === "income" ? "" : form.paymentMethod,
        debitCardId:
          form.type === "expense" && selectedDebitCardId
            ? selectedDebitCardId
            : undefined,
        bankAccountId:
          form.type === "income"
            ? incomeBankAccountId || undefined
            : form.type === "expense" &&
                directBankAccountId &&
                !selectedDebitCardId
              ? directBankAccountId
              : undefined,
      };

      if (editTx) {
        await api.put(`/transactions/${editTx._id}`, payload);
        toast.success("Transaction updated! ✅");
      } else {
        const currentBalance = calculateTotalBalance();
        const remainingBalance =
          currentBalance +
          (payload.type === "income" ? payload.amount : -payload.amount);
        await api.post("/transactions", payload);
        toast.success(
          `${payload.type} of ₹${Number(payload.amount).toLocaleString()} complete ✅ Balance: ₹${Math.abs(remainingBalance).toLocaleString()}`,
        );
      }
      setShowModal(false);
      setEditTx(null);
      resetForm();
      fetchAllTransactions();
      fetchCreditCardBills();
      fetchDebitCards();
      fetchBankAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving transaction");
    }
  };

   const buildPaymentSourceOptionsHtml = () => {
    const bankOptions = bankAccounts
      .map((bank) => {
        const value = encodeURIComponent(
          JSON.stringify({
            type: "bank",
            id: bank._id,
            name: bank.bankName,
            number: bank.accountNumber || "",
            balance: bank.balance || 0,
          }),
        );
        return `<option value="${value}">🏦 ${bank.bankName} ••••${String(bank.accountNumber).slice(-4)} — ₹${Number(bank.balance || 0).toLocaleString("en-IN")}</option>`;
      })
      .join("");

    const debitOptions = debitCards
      .map((card) => {
        const bal = card.linkedBankAccount?.balance ?? 0;
        const value = encodeURIComponent(
          JSON.stringify({
            type: "debit",
            id: card._id,
            name: card.cardName,
            number: card.cardNumber || "",
            balance: bal,
          }),
        );
        return `<option value="${value}">💳 ${card.cardName} ••••${String(card.cardNumber).slice(-4)} (${card.linkedBankAccount?.bankName}) — ₹${Number(bal).toLocaleString("en-IN")}</option>`;
      })
      .join("");

    const hasOptions = bankAccounts.length > 0 || debitCards.length > 0;
    return `<option value="">${hasOptions ? "Select bank account or debit card" : "No bank accounts/debit cards found"}</option>${bankOptions}${debitOptions}`;
  };

  const handlePayBill = async (bill) => {
    try {
      const outstanding = Number(
        bill.outstandingAmount || bill.totalAmount || 0,
      );
      const paymentSourceOptions = buildPaymentSourceOptionsHtml();

      const result = await Swal.fire({
        title: "Pay Credit Card Bill",
        customClass: {
          popup: "transaction-payment-swal",
          htmlContainer: "transaction-payment-swal-body",
          confirmButton: "transaction-payment-swal-confirm",
          cancelButton: "transaction-payment-swal-cancel",
        },
        html: `
          <div style="font-size:16px">
            Outstanding Amount:
            <strong>₹${outstanding.toLocaleString()}</strong>
          </div>
          <div style="margin-top: 18px; text-align: left;">
            <label for="swal-payment-source" style="display:block; margin-bottom:6px; font-weight:600;">Choose payment source</label>
            <select id="swal-payment-source" class="swal2-input" style="width:100%; min-height:44px;">
              ${paymentSourceOptions}
            </select>
          </div>
          <div style="margin-top: 18px; text-align: left;">
            <label for="swal-payment-amount" style="display:block; margin-bottom:6px; font-weight:600;">Enter amount to pay</label>
            <input id="swal-payment-amount" type="number" value="${outstanding}" min="1" max="${outstanding}" step="0.01" class="swal2-input" />
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Pay Now",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#111827",
        focusConfirm: false,
        preConfirm: () => {
          const sourceEl = document.getElementById("swal-payment-source");
          const amountEl = document.getElementById("swal-payment-amount");
          const sourceValue = sourceEl?.value;
          const amountValue = Number(amountEl?.value);

          if (!sourceValue) {
            Swal.showValidationMessage("Please choose a payment source");
            return false;
          }
          if (!amountValue || amountValue <= 0) {
            Swal.showValidationMessage("Please enter a valid amount");
            return false;
          }
          if (amountValue > outstanding) {
            Swal.showValidationMessage(
              `Maximum payable amount is ₹${outstanding.toLocaleString("en-IN")}`,
            );
            return false;
          }

          const src = JSON.parse(decodeURIComponent(sourceValue));
          if (amountValue > src.balance) {
            Swal.showValidationMessage(
              `Insufficient Balance. Account has only ₹${Number(src.balance).toLocaleString("en-IN")}`,
            );
            return false;
          }

          return { source: src, amount: amountValue };
        },
      });

      if (!result.isConfirmed) return;

      const { source, amount: paymentAmount } = result.value;

      await api.put(`/credit-card-bills/${bill._id}/pay`, {
        amount: paymentAmount,
      });

      await api.post("/transactions", {
        type: "expense",
        amount: paymentAmount,
        category: "credit_card_emi",
        description: "Credit Card Bill Payment",
        date: today(),
        paymentMethod: source.type === "debit" ? "debit_card" : "bank",
        bankName: source.name,
        accountNumber: source.number,
        bankAccountId: source.type === "bank" ? source.id : undefined,
        debitCardId: source.type === "debit" ? source.id : undefined,
      });

      toast.success(
        `₹${paymentAmount.toLocaleString("en-IN")} paid successfully`,
      );
      fetchCreditCardBills();
      fetchAllTransactions();
      fetchBankAccounts();
      fetchDebitCards();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Error paying credit card bill",
      );
    }
  };

  const handlePayFullBill = async (bill) => {
    try {
      const outstanding = Number(
        bill.outstandingAmount || bill.totalAmount || 0,
      );
      if (outstanding <= 0) {
        toast.error("Nothing to pay for this bill");
        return;
      }

      const paymentSourceOptions = buildPaymentSourceOptionsHtml();

      const result = await Swal.fire({
        title: "Confirm Full Payment",
        customClass: {
          popup: "transaction-payment-swal",
          htmlContainer: "transaction-payment-swal-body",
          confirmButton: "transaction-payment-swal-confirm",
          cancelButton: "transaction-payment-swal-cancel",
        },
        html: `
          <div style="font-size:16px">
            Pay full outstanding amount:
            <strong>₹${outstanding.toLocaleString()}</strong>
          </div>
          <div style="margin-top: 18px; text-align: left;">
            <label for="swal-payment-source" style="display:block; margin-bottom:6px; font-weight:600;">Choose payment source</label>
            <select id="swal-payment-source" class="swal2-input" style="width:100%; min-height:44px;">
              ${paymentSourceOptions}
            </select>
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Pay Full Amount",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#111827",
        focusConfirm: false,
        preConfirm: () => {
          const sourceEl = document.getElementById("swal-payment-source");
          const sourceValue = sourceEl?.value;
          if (!sourceValue) {
            Swal.showValidationMessage("Please choose a payment source");
            return false;
          }
          const src = JSON.parse(decodeURIComponent(sourceValue));
          if (outstanding > src.balance) {
            Swal.showValidationMessage(
              `Insufficient Balance. Account has only ₹${Number(src.balance).toLocaleString("en-IN")}`,
            );
            return false;
          }
          return { source: src };
        },
      });

      if (!result.isConfirmed) return;

      const { source } = result.value;

      await api.put(`/credit-card-bills/${bill._id}/pay`, {
        amount: outstanding,
      });

      await api.post("/transactions", {
        type: "expense",
        amount: outstanding,
        category: "credit_card_emi",
        description: "Credit Card Bill Payment (Full)",
        date: today(),
        paymentMethod: source.type === "debit" ? "debit_card" : "bank",
        bankName: source.name,
        accountNumber: source.number,
        bankAccountId: source.type === "bank" ? source.id : undefined,
        debitCardId: source.type === "debit" ? source.id : undefined,
      });

      toast.success(
        `Full payment of ₹${outstanding.toLocaleString("en-IN")} completed`,
      );
      fetchCreditCardBills();
      fetchAllTransactions();
      fetchBankAccounts();
      fetchDebitCards();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Error paying full credit card bill",
      );
    }
  };

  const handleOpenEmiModal = (bill) => {
    setEmiBillTarget(bill);
    setEmiMonths(6);
  };

  const handleConvertBillToEMI = async () => {
    if (!emiBillTarget) return;

    try {
      await api.put(`/credit-card-bills/${emiBillTarget._id}/convert-to-emi`, {
        months: emiMonths,
      });
      toast.success(`Converted to ${emiMonths}-month EMI plan`);
      setEmiBillTarget(null);
      fetchCreditCardBills();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Error converting statement to EMI",
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: "Delete this transaction?",
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6b7280",
      });
      if (!result.isConfirmed) return;
      await api.delete(`/transactions/${id}`);
      toast.success("Deleted!");
      fetchAllTransactions();
      fetchCreditCardBills();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleEdit = (tx) => {
    setEditTx(tx);
    setForm({
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      description: tx.description || "",
      date: tx.date.split("T")[0],
      paymentMethod: tx.paymentMethod || "card",
      bankName: tx.bankName || "",
      accountNumber: tx.accountNumber || "",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    const banks = JSON.parse(localStorage.getItem("banks")) || [];
    const cards = JSON.parse(localStorage.getItem("cards")) || [];
    const bank = banks.find(
      (b) => b.bankName === localStorage.getItem("selectedBank"),
    );
    const card = cards.find(
      (c) => c.cardName === localStorage.getItem("selectedCard"),
    );
    setForm({
      type: "expense",
      amount: "",
      category: "",
      description: "",
      date: today(),
      paymentMethod: card ? "credit_card" : "card",
      bankName: card?.cardName || bank?.bankName || "",
      accountNumber: card?.cardNumber || bank?.accountNumber || "",
    });
    setSelectedDebitCardId("");
    setDebitCardBalance(null);
    setIncomeBankAccountId("");
    setDirectBankAccountId("");
    setPaymentMethodType("bank");
  };

  const openAdd = useCallback(() => {
    setEditTx(null);
    resetForm();
    setShowModal(true);
  }, []);

  useKeyboardShortcuts({ onNewTransaction: openAdd });

  const handleTypeChange = (t) => {
    const cards = JSON.parse(localStorage.getItem("cards")) || [];
    const card = cards.find(
      (c) => c.cardName === localStorage.getItem("selectedCard"),
    );
    const expenseSource = card
      ? {
          paymentMethod: "credit_card",
          bankName: card.cardName,
          accountNumber: card.cardNumber,
        }
      : { paymentMethod: "card", bankName: "", accountNumber: "" };
    setSelectedDebitCardId("");
    setDebitCardBalance(null);
    setIncomeBankAccountId("");
    setDirectBankAccountId("");
    setPaymentMethodType("bank");
    setForm({
      ...form,
      type: t,
      category: "",
      date: today(),
      paymentMethod: t === "expense" ? expenseSource.paymentMethod : "",
      bankName: t === "expense" ? expenseSource.bankName : "",
      accountNumber: t === "expense" ? expenseSource.accountNumber : "",
    });
  };

  const cardsWithLimit = savedCards.filter(
    (card) => Number(card.creditLimit) > 0,
  );

  const getCardBill = (card) => {
    const matchedBills = bills.filter((bill) => {
      const cardNameMatches = bill.cardName === card.cardName;
      const cardNumberMatches =
        card.cardNumber && bill.cardNumber === card.cardNumber;
      return cardNameMatches || cardNumberMatches;
    });

    return (
      matchedBills.sort((a, b) => {
        const aDate = new Date(a.createdAt || a.statementDate || 0).getTime();
        const bDate = new Date(b.createdAt || b.statementDate || 0).getTime();
        return bDate - aDate;
      })[0] || null
    );
  };

  const getCardLimitInfo = (card) => {
    const limit = Number(card.creditLimit) || 0;
    const cardBills = bills.filter((bill) => {
      const cardNameMatches = bill.cardName === card.cardName;
      const cardNumberMatches =
        card.cardNumber && bill.cardNumber === card.cardNumber;
      return cardNameMatches || cardNumberMatches;
    });

  

    const used = cardBills
      .filter((bill) => bill.status !== "Paid")
      .reduce(
        (sum, bill) =>
          sum +
          Math.max(
            Number(bill.totalAmount || 0) - Number(bill.paidAmount || 0),
            0,
          ),
        0,
      );

    const available = Math.max(0, limit - used);
    const usedPercent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

    return {
      limit,
      used,
      available,
      usedPercent,
    };
  };

  const totalBalance = calculateTotalBalance();
  const totalIncome = calculateIncome();
  const totalExpense = calculateExpense();
  const pendingBills = bills.filter((bill) => bill.status === "Pending");
  const emiBills = bills.filter((bill) => bill.status === "EMI");
  const paidBills = bills.filter((bill) => bill.status === "Paid");
  const overdueBills = bills.filter((bill) => bill.status === "Overdue");

  const displayTxs = [...transactions].sort(
    (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date),
  );

  return (
    <div className="transactions-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="transaction-title">
            <TbTransfer className="transaction-icon" /> Transactions
          </h1>
          <p className="page-sub">
            {filters.bankName
              ? `Showing: ${filters.bankName}`
              : "All Accounts & Cards"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary export-btn"
            onClick={() => {
              exportTransactionsPDF(displayTxs);
              toast.success("PDF exported!");
            }}
            title="Export as PDF"
          >
            <FaFilePdf size={14} color="#dc2626" /> PDF
          </button>
          <button
            className="btn btn-secondary export-btn"
            onClick={() => {
              exportTransactionsExcel(displayTxs);
              toast.success("Excel exported!");
            }}
            title="Export as Excel"
          >
            <FaFileExcel size={14} color="#16a34a" /> Excel
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            + Add Transaction
          </button>
        </div>
      </div>

      <div className="summary-wrapper1">
        <div className="summary-card balance-card">
          <h3>
            {filters.bankName ? `${filters.bankName} Balance` : "Total Balance"}
          </h3>
          <h1
            className={
              totalBalance >= 0 ? "amount-positive" : "amount-negative"
            }
          >
            ₹{Math.abs(totalBalance).toLocaleString()}
          </h1>
        </div>
        <div className="summary-card expense-card">
          <h3>
            {filters.bankName ? `${filters.bankName} Expense` : "Total Expense"}
          </h3>
          <h1>₹{totalExpense.toLocaleString()}</h1>
        </div>
        <div className="summary-card income-card">
          <h3>
            {filters.bankName ? `${filters.bankName} Income` : "Total Income"}
          </h3>
          <h1>₹{totalIncome.toLocaleString()}</h1>
        </div>
      </div>

      {cardsWithLimit.length > 0 && (
        <div className="card credit-limit-section">
          <h3 className="credit-limit-title">
            <FaCreditCard size={16} /> Credit Card Limits
          </h3>
          <div className="credit-limit-grid">
            {cardsWithLimit.map((card, i) => {
              const info = getCardLimitInfo(card);
              const cardBill = getCardBill(card);

              return (
                <div key={i} className="credit-limit-card">
                  <div className="credit-limit-card-header">
                    <div className="credit-limit-card-icon">
                      <FaCreditCard size={18} color="#6c8cff" />
                    </div>
                    <div className="credit-limit-card-info">
                      <div className="credit-limit-card-name">
                        {card.cardName}
                      </div>
                      <div className="credit-limit-card-num">
                        ••••{card.cardNumber.slice(-4)}
                      </div>
                    </div>
                    <div
                      className={`credit-limit-status ${info.usedPercent >= 90 ? "danger" : info.usedPercent >= 70 ? "warning" : "safe"}`}
                    >
                      {info.usedPercent >= 90
                        ? "Critical"
                        : info.usedPercent >= 70
                          ? " High"
                          : " Good"}
                    </div>
                  </div>

                  <div className="credit-limit-bar-wrap">
                    <div className="credit-limit-bar">
                      <div
                        className="credit-limit-bar-fill"
                        style={{
                          width: `${info.usedPercent}%`,
                          background:
                            info.usedPercent >= 90
                              ? "linear-gradient(90deg, #ef4444, #dc2626)"
                              : info.usedPercent >= 70
                                ? "linear-gradient(90deg, #f59e0b, #d97706)"
                                : "linear-gradient(90deg, #6c8cff, #8ea6ff)",
                        }}
                      />
                    </div>
                    <span className="credit-limit-pct">
                      {info.usedPercent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="credit-limit-amounts">
                    <div className="credit-limit-amt">
                      <span>Total Limit</span>
                      <strong>₹{info.limit.toLocaleString()}</strong>
                    </div>
                    <div className="credit-limit-amt">
                      <span>Used</span>
                      <strong style={{ color: "#dc2626" }}>
                        ₹{info.used.toLocaleString()}
                      </strong>
                    </div>
                    <div className="credit-limit-amt">
                      <span>Available</span>
                      <strong style={{ color: "#059669" }}>
                        ₹{info.available.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {cardBill && cardBill.status !== "Paid" && (
                    <div className="credit-limit-card-footer">
                      <button
                        type="button"
                        className="btn btn-secondary credit-bill-full-pay-btn"
                        onClick={() => handlePayBill(cardBill)}
                      >
                        Pay bill
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary credit-bill-full-pay-btn"
                        onClick={() => handlePayFullBill(cardBill)}
                      >
                        Full Payment
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="filters card">
        <select
          className="input filter-select"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="loan_emi">Loan EMI</option>
        </select>
        <select
          className="input filter-select"
          value={filters.bankName}
          onChange={(e) => setFilters({ ...filters, bankName: e.target.value })}
        >
          <option value="">All Accounts & Cards</option>
          {savedBanks.map((bank, i) => (
            <option key={`bank-${i}`} value={bank.bankName}>
              {bank.bankName}
            </option>
          ))}
          {savedCards.map((card, i) => (
            <option key={`card-${i}`} value={card.cardName}>
              {card.cardName}
            </option>
          ))}
        </select>
        {(filters.type || filters.bankName) && (
          <button
            className="btn btn-secondary"
            onClick={() => setFilters({ type: "", bankName: "" })}
          >
            Clear
          </button>
        )}
      </div>

      <div className="card tx-table-card">
        {loading ? (
          <div className="empty-state">
            <span className="loading" />
          </div>
        ) : displayTxs.length === 0 ? (
          <div className="empty-state">No transactions found </div>
        ) : (
          <table className="tx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Account / Card</th>
                <th>Bank-EMI</th>
                <th>Category</th>
                <th>Payment</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayTxs.map((tx) => (
                <tr
                  key={tx._id}
                  className={tx.isLoanEMI ? "loan-emi-row-highlight" : ""}
                >
                  <td className="tx-date">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td>
                    {tx.bankName ? (
                      <div className="bank-cell">
                        <div>
                          <div className="bank-cell-name">{tx.bankName}</div>
                          {tx.accountNumber && (
                            <div className="bank-cell-acc">
                              ••••{tx.accountNumber.slice(-4)}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {tx.description
                        ? tx.description
                            .replace(/[_-]/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())
                        : "—"}

                      {tx.isLoanEMI && (
                        <span className="loan-emi-badge">🏦 LOAN EMI</span>
                      )}
                    </div>

                    {tx.loanTitle && (
                      <div className="loan-title-small">
                        {tx.loanTitle
                          .replace(/[_-]/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </div>
                    )}
                  </td>
                   <td>
                    <span className="cat-chip">
                      {(tx.category || "—").replace(/_/g, " ").toUpperCase()}
                    </span>
                  </td>

                  <td>
                    {tx.paymentMethod ? (
                      <span className="payment-method-chip">
                        {tx.paymentMethod.toUpperCase()}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${tx.type}`}>
                      {tx.type?.toUpperCase()}
                    </span>
                  </td>
                  <td
                    className={
                      tx.type === "income"
                        ? "amount-positive"
                        : "amount-negative"
                    }
                  >
                    {tx.type === "income" ? "+" : "-"}₹
                    {Number(tx.amount).toLocaleString()}
                  </td>
                  <td className="running-balance">
                    ₹{getRunningBalance(tx).toLocaleString()}
                  </td>
                  <td className="tx-actions">
                    <button
                      className="action-btn edit-btn"
                      onClick={() => handleEdit(tx)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDelete(tx._id)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal &&
        createPortal(
          <div
            className="modal-overlay transaction-modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <div className="modal glass fade-in transaction-edit-modal">
              <div className="modal-header">
                <h3>{editTx ? "Edit Transaction" : "New Transaction"}</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="type-toggle">
                  {["expense", "income"].map((t) => (
                    <button
                      type="button"
                      key={t}
                      className={`type-btn ${form.type === t ? "active-" + t : ""}`}
                      onClick={() => handleTypeChange(t)}
                    >
                      {t === "income" ? (
                        <>
                          <FaArrowTrendUp /> Income
                        </>
                      ) : (
                        <>
                          <FaArrowTrendDown /> Expense
                        </>
                      )}
                    </button>
                  ))}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      className="input"
                      type="date"
                      value={form.date}
                      min={
                        form.type === "expense"
                          ? expenseMinDate()
                          : incomeMinDate()
                      }
                      max={today()}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                {form.type === "expense" && (
                  <>
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        className="input"
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                        required
                      >
                        <option value="">Select category</option>
                        {CATEGORIES.expense.map((c) => (
                          <option key={c} value={c.toLowerCase()}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                {form.type === "income" && (
                  <div className="form-group">
                    <label>Deposit to Account</label>
                    <select
                      className="input"
                      value={incomeBankAccountId}
                      onChange={(e) => {
                        const acc = bankAccounts.find(
                          (b) => b._id === e.target.value,
                        );
                        setIncomeBankAccountId(e.target.value);
                        setForm({
                          ...form,
                          bankName: acc?.bankName || "",
                          accountNumber: acc?.accountNumber || "",
                        });
                      }}
                    >
                      <option value="">— Select bank account —</option>
                      {bankAccounts.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.bankName} ••••{b.accountNumber.slice(-4)} —
                          Balance: ₹{Number(b.balance).toLocaleString("en-IN")}
                        </option>
                      ))}
                    </select>
                    {bankAccounts.length === 0 && (
                      <p
                        style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}
                      >
                        No bank accounts found. Add one in Settings first.
                      </p>
                    )}
                  </div>
                )}

                {form.type === "expense" && (
                  <div className="form-group">
                    <label>Pay From</label>

                    <div className="pay-method-tabs">
                      <button
                        type="button"
                        className={`pay-method-tab ${paymentMethodType === "bank" ? "active" : ""}`}
                        onClick={() => switchPaymentType("bank")}
                      >
                        Bank Account
                      </button>
                      {debitCards.length > 0 && (
                        <button
                          type="button"
                          className={`pay-method-tab ${paymentMethodType === "debit" ? "active" : ""}`}
                          onClick={() => switchPaymentType("debit")}
                        >
                          Debit Card
                        </button>
                      )}
                      {savedCards.length > 0 && (
                        <button
                          type="button"
                          className={`pay-method-tab ${paymentMethodType === "credit" ? "active" : ""}`}
                          onClick={() => switchPaymentType("credit")}
                        >
                          Credit Card
                        </button>
                      )}
                    </div>

                    {paymentMethodType === "bank" && (
                      <div className="pay-method-panel">
                        <select
                          className="input"
                          value={directBankAccountId}
                          onChange={(e) => {
                            const acc = bankAccounts.find(
                              (b) => b._id === e.target.value,
                            );
                            setDirectBankAccountId(e.target.value);
                            setForm({
                              ...form,
                              bankName: acc?.bankName || "",
                              accountNumber: acc?.accountNumber || "",
                              paymentMethod: "bank",
                            });
                          }}
                        >
                          <option value="">— Select bank account —</option>
                          {bankAccounts.map((bank) => (
                            <option key={bank._id} value={bank._id}>
                              {bank.bankName} ••••{bank.accountNumber.slice(-4)}{" "}
                              — ₹{Number(bank.balance).toLocaleString("en-IN")}
                            </option>
                          ))}
                        </select>
                        {bankAccounts.length === 0 && (
                          <p className="pay-method-hint">
                            No bank accounts yet. Add one in Settings.
                          </p>
                        )}
                        {directBankAccountId &&
                          (() => {
                            const acc = bankAccounts.find(
                              (b) => b._id === directBankAccountId,
                            );
                            if (!acc) return null;
                            const amt = Number(form.amount) || 0;
                            const insufficient = amt > 0 && amt > acc.balance;
                            return (
                              <div
                                className={`debit-balance-info ${insufficient ? "insufficient" : "sufficient"}`}
                              >
                                {insufficient
                                  ? `⛔ Insufficient. ${acc.bankName} has only ₹${Number(acc.balance).toLocaleString("en-IN")}`
                                  : `✅ Balance: ₹${Number(acc.balance).toLocaleString("en-IN")}${amt > 0 ? ` → After: ₹${(acc.balance - amt).toLocaleString("en-IN")}` : ""}`}
                              </div>
                            );
                          })()}
                      </div>
                    )}

                    {paymentMethodType === "debit" && (
                      <div className="pay-method-panel">
                        <select
                          className="input"
                          value={selectedDebitCardId}
                          onChange={(e) =>
                            handleDebitCardSelect(e.target.value)
                          }
                        >
                          <option value="">— Select debit card —</option>
                          {debitCards.map((card) => (
                            <option key={card._id} value={card._id}>
                              {card.cardName} ••••{card.cardNumber.slice(-4)} →{" "}
                              {card.linkedBankAccount?.bankName}
                            </option>
                          ))}
                        </select>
                        {selectedDebitCardId && debitCardBalance !== null && (
                          <div
                            className={`debit-balance-info ${Number(form.amount) > debitCardBalance.balance ? "insufficient" : "sufficient"}`}
                          >
                            {Number(form.amount) > debitCardBalance.balance
                              ? `⛔ Insufficient Balance. Account has only ₹${Number(debitCardBalance.balance).toLocaleString("en-IN")}`
                              : `✅ Balance: ₹${Number(debitCardBalance.balance).toLocaleString("en-IN")} (${debitCardBalance.bankName})${Number(form.amount) > 0 ? ` → After: ₹${(debitCardBalance.balance - Number(form.amount)).toLocaleString("en-IN")}` : ""}`}
                          </div>
                        )}
                      </div>
                    )}

                    {paymentMethodType === "credit" && (
                      <div className="pay-method-panel">
                        <select
                          className="input"
                          value={form.bankName}
                          onChange={(e) => {
                            const card = savedCards.find(
                              (c) => c.cardName === e.target.value,
                            );
                            setForm({
                              ...form,
                              bankName: card?.cardName || "",
                              accountNumber: card?.cardNumber || "",
                              paymentMethod: "credit_card",
                            });
                          }}
                        >
                          <option value="">— Select credit card —</option>
                          {savedCards.map((card, i) => (
                            <option key={i} value={card.cardName}>
                              {card.cardName} ••••{card.cardNumber.slice(-4)}
                              {card.creditLimit > 0
                                ? ` — Limit ₹${Number(card.creditLimit).toLocaleString("en-IN")}`
                                : ""}
                            </option>
                          ))}
                        </select>
                        <p className="pay-method-hint">
                          Credit card expenses are tracked via monthly bill
                          statements.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="form-group">
                  <label>Description</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Optional note..."
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
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
                  <button type="submit" className="btn btn-primary">
                    {editTx ? (
                      <>
                        <FaSave /> Update
                      </>
                    ) : (
                      <>
                        <FaPlus /> Add
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {emiBillTarget && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setEmiBillTarget(null)
          }
        >
          <div className="modal glass fade-in" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Convert to EMI</h3>
              <button
                className="modal-close"
                onClick={() => setEmiBillTarget(null)}
              >
                ✕
              </button>
            </div>

            <div className="credit-emi-summary">
              <div>
                <strong>{emiBillTarget.cardName}</strong>
              </div>
              <div>
                Outstanding: ₹
                {Number(
                  emiBillTarget.outstandingAmount ||
                    emiBillTarget.totalAmount ||
                    0,
                ).toLocaleString()}
              </div>
              <div>Choose EMI duration</div>
            </div>

            <div className="emi-term-grid">
              {[3, 6, 9, 12].map((months) => (
                <button
                  key={months}
                  type="button"
                  className={`emi-term-btn ${emiMonths === months ? "active" : ""}`}
                  onClick={() => setEmiMonths(months)}
                >
                  {months} Months
                </button>
              ))}
            </div>

            <div className="credit-emi-calculation">
              Monthly installment: ₹
              {Math.round(
                Number(
                  emiBillTarget.outstandingAmount ||
                    emiBillTarget.totalAmount ||
                    0,
                ) / emiMonths,
              ).toLocaleString()}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEmiBillTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConvertBillToEMI}
              >
                Convert to EMI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreditBillGroup({
  title,
  bills,
  expandedBillId,
  onToggleBill,
  onPayFullBill,
  onConvertToEmi,
  showAllPaidBills = true,
  onToggleShowAllPaidBills,
}) {
  const isPaidGroup = title === "Paid Bills";
  const visibleBills =
    isPaidGroup && !showAllPaidBills ? bills.slice(0, 5) : bills;
  const hasMorePaidBills = isPaidGroup && bills.length > 5;

  return (
    <div className="credit-bill-group">
      <div className="credit-bill-group-title">
        <span>{title}</span>
        <strong>{bills.length}</strong>
      </div>

      {visibleBills.length === 0 ? (
        <div className="credit-bill-empty">No bills</div>
      ) : (
        <div className="credit-bill-list">
          {visibleBills.map((bill) => (
            <div
              key={bill._id}
              className={`credit-bill-item status-${bill.status.toLowerCase()}`}
            >
              <div className="credit-bill-top">
                <div>
                  <div className="credit-bill-card-name">{bill.cardName}</div>
                  <div className="credit-bill-meta">
                    {bill.cardNumber
                      ? `xxxx${bill.cardNumber.slice(-4)} - `
                      : ""}
                    Statement {formatDate(bill.statementDate || bill.createdAt)}
                  </div>
                </div>
                <span
                  className={`credit-bill-status status-${bill.status.toLowerCase()}`}
                >
                  {bill.status}
                </span>
              </div>

              <div className="credit-bill-amount">
                ₹
                {Number(
                  bill.outstandingAmount || bill.totalAmount || 0,
                ).toLocaleString()}
              </div>
              <div className="credit-bill-meta">
                {bill.transactionCount || bill.transactions?.length || 0}{" "}
                transactions
              </div>
              <div className="credit-bill-meta">
                Due {formatDate(bill.dueDate)}
              </div>
              <div
                className={
                  bill.daysRemaining < 0
                    ? "credit-bill-overdue"
                    : "credit-bill-days"
                }
              >
                {bill.status === "Paid"
                  ? `Paid ${bill.paidAt ? formatDate(bill.paidAt) : ""}`
                  : bill.daysRemaining < 0
                    ? `${Math.abs(bill.daysRemaining)} days overdue`
                    : `${bill.daysRemaining} days remaining`}
              </div>

              <button
                type="button"
                className="btn btn-secondary credit-bill-toggle-btn"
                onClick={() =>
                  onToggleBill(expandedBillId === bill._id ? null : bill._id)
                }
              >
                {expandedBillId === bill._id
                  ? "Hide Transactions"
                  : "View Transactions"}
              </button>

              {expandedBillId === bill._id && (
                <div className="credit-bill-accordion">
                  {(bill.transactions || []).length === 0 ? (
                    <div className="credit-bill-empty">
                      No transaction details
                    </div>
                  ) : (
                    (bill.transactions || []).map((transaction) => (
                      <div
                        key={transaction._id || transaction.id}
                        className="credit-bill-transaction"
                      >
                        <div>
                          <div className="credit-bill-transaction-title">
                            {transaction.description ||
                              transaction.category ||
                              "Transaction"}
                          </div>
                          <div className="credit-bill-meta">
                            {formatDate(
                              transaction.date || transaction.createdAt,
                            )}
                          </div>
                        </div>
                        <strong>
                          ₹{Number(transaction.amount || 0).toLocaleString()}
                        </strong>
                      </div>
                    ))
                  )}
                </div>
              )}

              {bill.status === "EMI" && bill.emiMonths ? (
                <div className="credit-bill-meta credit-bill-emi-note">
                  EMI plan: {bill.emiMonths} months · ₹
                  {Math.round(bill.emiAmount || 0).toLocaleString()} / month
                </div>
              ) : null}

              {bill.status !== "Paid" && bill.status !== "EMI" && (
                <div className="credit-bill-actions">
                  <button
                    type="button"
                    className="btn btn-primary credit-bill-pay-btn"
                    onClick={() => onPayFullBill?.(bill)}
                  >
                    Pay Full Bill
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary credit-bill-pay-btn"
                    onClick={() => onConvertToEmi?.(bill)}
                  >
                    Convert to EMI
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasMorePaidBills && (
        <button
          type="button"
          className="btn btn-secondary credit-bill-viewall-btn"
          onClick={onToggleShowAllPaidBills}
        >
          {showAllPaidBills ? "Show Less" : "View All"}
        </button>
      )}
    </div>
  );
}

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}