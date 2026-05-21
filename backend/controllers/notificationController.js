import Notification from '../models/Notification.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { targetUser: req.user._id },
        { targetUser: null }
      ],
      dismissedBy: { $ne: req.user._id } // Don't show if already dismissed
    })
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

// @desc    Dismiss single notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const dismissNotification = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { dismissedBy: req.user._id }
    });
    res.json({ message: 'Notification dismissed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to dismiss notification' });
  }
};

// @desc    Clear all notifications for user
// @route   DELETE /api/notifications
// @access  Private
export const clearUserNotifications = async (req, res) => {
  try {
    // Add user to dismissedBy for all their current notifications
    await Notification.updateMany(
      {
        $or: [
          { targetUser: req.user._id },
          { targetUser: null }
        ],
        dismissedBy: { $ne: req.user._id }
      },
      { $addToSet: { dismissedBy: req.user._id } }
    );
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear notifications' });
  }
};
