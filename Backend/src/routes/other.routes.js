const express = require('express');
const goalRouter = express.Router();
const notifRouter = express.Router();
const { getGoals, createGoal, updateGoal, deleteGoal, addFunds } = require('../controllers/goal.controller');
const { getNotifications, markAsRead, deleteNotification } = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth');

goalRouter.use(protect);
goalRouter.get('/', getGoals);
goalRouter.post('/', createGoal);
goalRouter.put('/:id', updateGoal);
goalRouter.delete('/:id', deleteGoal);
goalRouter.post('/:id/add-funds', addFunds);

notifRouter.use(protect);
notifRouter.get('/', getNotifications);
notifRouter.put('/mark-read', markAsRead);
notifRouter.delete('/:id', deleteNotification);

module.exports = { goalRouter, notifRouter };
