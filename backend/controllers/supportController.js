import SupportTicket from '../models/SupportTicket.js';

export const createTicket = async (req, res) => {
  const { subject, message, priority } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject: subject || 'General Inquiry',
      message,
      priority: priority || 'medium',
    });

    res.status(201).json({
      success: true,
      message: 'Ticket raised successfully',
      ticket,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
