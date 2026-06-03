import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const fmt = (n) => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : '—';

// ── Transactions PDF ──────────────────────────────────────────────────────────
export function exportTransactionsPDF(transactions, userName = '') {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ExpenseFlow — Transaction History', 14, 14);
  if (userName) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(userName, 250, 14, { align: 'right' });
  }

  // Meta row
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}   Total records: ${transactions.length}`, 14, 30);

  // Summary row
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  doc.setFontSize(9);
  doc.setTextColor(4, 120, 87);
  doc.text(`Total Income: ${fmt(income)}`, 14, 37);
  doc.setTextColor(185, 28, 28);
  doc.text(`Total Expense: ${fmt(expense)}`, 80, 37);
  doc.setTextColor(29, 78, 216);
  doc.text(`Net Balance: ${fmt(income - expense)}`, 160, 37);

  autoTable(doc, {
    startY: 42,
    head: [['Date', 'Description', 'Category', 'Payment', 'Account', 'Type', 'Amount']],
    body: transactions.map(t => [
      fmtDate(t.date),
      t.description || '—',
      cap(t.category),
      t.paymentMethod ? t.paymentMethod.toUpperCase() : '—',
      t.bankName || '—',
      t.type.toUpperCase(),
      fmt(t.amount),
    ]),
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 24 },
      5: { halign: 'center' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell(data) {
      if (data.column.index === 5) {
        data.cell.styles.textColor = data.cell.raw === 'INCOME' ? [4, 120, 87] : [185, 28, 28];
      }
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`ExpenseFlow-Transactions-${new Date().toISOString().split('T')[0]}.pdf`);
}

// ── Transactions Excel ────────────────────────────────────────────────────────
export function exportTransactionsExcel(transactions) {
  const rows = transactions.map(t => ({
    Date: fmtDate(t.date),
    Description: t.description || '',
    Category: cap(t.category),
    'Payment Method': t.paymentMethod || '',
    Account: t.bankName || '',
    Type: cap(t.type),
    Amount: Number(t.amount || 0),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  // Summary sheet
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const summary = XLSX.utils.aoa_to_sheet([
    ['ExpenseFlow Summary'],
    ['Generated', new Date().toLocaleDateString('en-IN')],
    [],
    ['Total Income',  income],
    ['Total Expense', expense],
    ['Net Balance',   income - expense],
    ['Total Records', transactions.length],
  ]);
  summary['!cols'] = [{ wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, summary, 'Summary');

  XLSX.writeFile(wb, `ExpenseFlow-Transactions-${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ── Reports PDF ───────────────────────────────────────────────────────────────
export function exportReportsPDF({ income, expense, savingsRate, categoryStats, trendData, userName = '' }) {
  const doc = new jsPDF();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ExpenseFlow — Financial Report', 14, 14);
  if (userName) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(userName, 196, 14, { align: 'right' });
  }

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 30);

  // Summary box
  autoTable(doc, {
    startY: 35,
    head: [['Metric', 'Value']],
    body: [
      ['Total Income',   fmt(income)],
      ['Total Expense',  fmt(expense)],
      ['Net Savings',    fmt(income - expense)],
      ['Savings Rate',   `${savingsRate}%`],
    ],
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: 'striped',
    tableWidth: 90,
    margin: { left: 14 },
  });

  // Category breakdown
  if (categoryStats?.length) {
    const total = categoryStats.reduce((s, c) => s + c.total, 0);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Category', 'Amount', 'Share']],
      body: categoryStats.map(c => [
        cap(c._id),
        fmt(c.total),
        `${((c.total / total) * 100).toFixed(1)}%`,
      ]),
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      tableWidth: 90,
      margin: { left: 14 },
    });
  }

  // Monthly trend table
  if (trendData?.length) {
    autoTable(doc, {
      startY: 35,
      head: [['Month', 'Income', 'Expense', 'Net']],
      body: trendData.map(d => [
        d.month,
        fmt(d.income),
        fmt(d.expense),
        fmt((d.income || 0) - (d.expense || 0)),
      ]),
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      tableWidth: 90,
      margin: { left: 110 },
    });
  }

  doc.save(`ExpenseFlow-Report-${new Date().toISOString().split('T')[0]}.pdf`);
}