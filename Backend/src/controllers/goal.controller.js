const Goal = require('../models/Goal');
const Notification = require('../models/Notification');

const getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, goals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createGoal = async (req, res) => {
  try {
    const goal = await Goal.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    // Check if goal completed
    if (goal.currentAmount >= goal.targetAmount && goal.status === 'active') {
      await Goal.findByIdAndUpdate(goal._id, { status: 'completed' });
      await Notification.create({
        user: req.user._id,
        title: '🎉 Goal Achieved!',
        message: `Congratulations! You've completed your goal: "${goal.title}"`,
        type: 'goal',
        icon: '🏆'
      });
    }
    res.json({ success: true, goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteGoal = async (req, res) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    goal.currentAmount += Number(amount);
    if (goal.currentAmount >= goal.targetAmount) goal.status = 'completed';
    await goal.save();
    res.json({ success: true, goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getGoals, createGoal, updateGoal, deleteGoal, addFunds };
