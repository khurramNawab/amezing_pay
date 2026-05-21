import SupportTicket from '../../models/SupportTicket.js';

export const getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'name phone email')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTicketStatus = async (req, res) => {
  const { ticketId } = req.params;
  const { status, adminNote } = req.body;

  try {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (status) ticket.status = status;
    if (adminNote) ticket.adminNote = adminNote;

    await ticket.save();
    res.json({ message: 'Ticket updated successfully', ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    await SupportTicket.findByIdAndDelete(req.params.ticketId);
    res.json({ message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
