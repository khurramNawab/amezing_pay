import Notification from '../../models/Notification.js';

// @desc    Send/Broadcast notification
export const sendNotification = async (req, res) => {
  const { title, message, targetUser } = req.body || {};
  if (!title || !message) {
    return res.status(400).json({ message: 'title and message are required' });
  }

  const doc = await Notification.create({
    title: String(title).trim(),
    message: String(message).trim(),
    targetUser: targetUser || null,
    createdBy: req.user?._id || null,
  });

  return res.status(201).json(doc);
};

// @desc    List sent notifications
export const listNotifications = async (req, res) => {
  try {
    const list = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('targetUser', 'phone name');
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Failed to list notifications' });
  }
};

// @desc    Update notification
export const updateNotification = async (req, res) => {
  try {
    const { title, message } = req.body;
    const doc = await Notification.findByIdAndUpdate(
      req.params.id,
      { title, message },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
};

// @desc    Delete notification (Globally)
export const deleteNotification = async (req, res) => {
  try {
    const doc = await Notification.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted globally' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
};
