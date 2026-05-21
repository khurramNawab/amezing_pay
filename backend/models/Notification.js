import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = global broadcast
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;

