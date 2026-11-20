import * as ticketService from "./ticket.service.js";
import { sendMail } from "../../utils/mailer.js";

export const getAllTickets = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const ticketsData = await ticketService.getAllTickets(
      req.user.role,
      req.user.employeeId,
      { page, limit }
    );
   

    if (page && limit && typeof ticketsData === "object" && !Array.isArray(ticketsData)) {
      return res.status(200).json({
        success: true,
        data: ticketsData.tickets,
        pagination: {
          total: ticketsData.total,
          page: ticketsData.page,
          limit: ticketsData.limit,
          totalPages: ticketsData.totalPages,
        },
      });
    }

    res.status(200).json({ success: true, data: ticketsData });
  } catch (error) {
    next(error);
  }
};

export const getTicketPool = async (req, res, next) => {
  try {
    const tickets = await ticketService.getTicketPool();

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignedTickets = async (req, res, next) => {
  try {
    const tickets = await ticketService.getAssignedTickets(req.user.employeeId);

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await ticketService.getTicketById(id);
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

export const createTicket = async (req, res, next) => {
  try {
    const ticketData =
      typeof req.body.ticket === "string"
        ? JSON.parse(req.body.ticket)
        : req.body.ticket || req.body;

    // Ensure the ticket creator ID matches the authenticated user if not set
    if (!ticketData.created_by && !ticketData.by && req.user?.employeeId) {
      ticketData.created_by = req.user.employeeId;
    }

    const ticket = await ticketService.createTicket(ticketData, req.file, req.user);

    // Send email notification safely in background without blocking response
    if (process.env.SMTP_USER) {
      const subject = `New Ticket #${ticket.id}: ${ticket.title}`;
      const html = `
        <p>Hello,</p>
        <p>A new ticket has been created in Ladera Ticket Management.</p>
        <ul>
          <li><strong>ID:</strong> ${ticket.id}</li>
          <li><strong>Title:</strong> ${ticket.title}</li>
          <li><strong>Created by:</strong> ${ticket.created_by_name || ticketData.createdBy || 'N/A'}</li>
        </ul>
        <p>View it at <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">the portal</a>.</p>
      `;
      sendMail({
        to: process.env.SMTP_USER,
        subject,
        html,
      }).catch((err) => {
        console.warn("[Mailer] Background notification failed:", err.message);
      });
    }

    res.status(201).json({
      success: true,
      message: "Ticket created",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    let updates = req.body || {};
    if (typeof updates.ticket === "string") {
      try {
        updates = JSON.parse(updates.ticket);
      } catch (_) {}
    }
    const removeAttachment =
      req.body.removeAttachment === "true" ||
      req.body.removeAttachment === true ||
      updates.removeAttachment === "true" ||
      updates.removeAttachment === true;

    const ticket = await ticketService.updateTicket(id, updates, req.file, removeAttachment);
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Ticket updated", data: ticket });
  } catch (error) {
    next(error);
  }
};

export const deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await ticketService.deleteTicket(id);
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Ticket deleted", data: ticket });
  } catch (error) {
    next(error);
  }
};
