// const Loan = require('../models/Loan');

// const getLoans = async (req, res) => {
//   try {
//     const loans = await Loan.find({ user: req.user._id }).sort({ createdAt: -1 });
//     res.json({ success: true, loans });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// const createLoan = async (req, res) => {
//   try {
//     const loan = await Loan.create({ ...req.body, user: req.user._id });
//     res.status(201).json({ success: true, loan });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// const updateLoan = async (req, res) => {
//   try {
//     const loan = await Loan.findOneAndUpdate(
//       { _id: req.params.id, user: req.user._id },
//       req.body,
//       { new: true }
//     );
//     if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
//     res.json({ success: true, loan });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// const deleteLoan = async (req, res) => {
//   try {
//     await Loan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
//     res.json({ success: true, message: 'Loan deleted' });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// const payEMI = async (req, res) => {
//   try {
//     const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
//     if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

//     const totalEMIs = loan.tenureYears * 12;
//     if (loan.paidEMIs >= totalEMIs) {
//       return res.json({ success: true, message: 'Loan already completed' });
//     }

//     loan.paidEMIs += 1;
//     if (loan.paidEMIs >= totalEMIs) loan.status = 'completed';
//     await loan.save();

//     res.json({ success: true, loan });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// module.exports = { getLoans, createLoan, updateLoan, deleteLoan, payEMI };



const Loan = require('../models/Loan');

const getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createLoan = async (req, res) => {
  try {
    const loan = await Loan.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteLoan = async (req, res) => {
  try {
    await Loan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Loan deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const payEMI = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const totalEMIs = loan.tenureYears * 12;
    if (loan.paidEMIs >= totalEMIs) {
      return res.json({ success: true, message: 'Loan already completed' });
    }

    // Capture the dynamic bank name from the user choice request body
    const { bankName } = req.body;

    loan.paidEMIs += 1;
    if (loan.paidEMIs >= totalEMIs) loan.status = 'completed';
    await loan.save();

    // Response me paidFrom bank key include kar di hai audit trace ke liye
    res.json({ success: true, loan, paidFrom: bankName || loan.bankName });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getLoans, createLoan, updateLoan, deleteLoan, payEMI };