'use strict';
const sequelize = require('../config/database');
const Customer = require('./Customer');
const Agent = require('./Agent');
const Department = require('./Department');
const Ticket = require('./Ticket');
const Response = require('./Response');
const Attachment = require('./Attachment');

// ── Associations ──────────────────────────────────────────────────────────────

// Customer ↔ Ticket
Customer.hasMany(Ticket, { foreignKey: 'customer_id', as: 'tickets' });
Ticket.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// Agent ↔ Ticket (assignment)
Agent.hasMany(Ticket, { foreignKey: 'assigned_to', as: 'assignedTickets' });
Ticket.belongsTo(Agent, { foreignKey: 'assigned_to', as: 'assignedAgent' });

// Ticket ↔ Response
Ticket.hasMany(Response, { foreignKey: 'ticket_id', as: 'responses' });
Response.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });

// Ticket ↔ Attachment
Ticket.hasMany(Attachment, { foreignKey: 'ticket_id', as: 'attachments' });
Attachment.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });

module.exports = {
    sequelize,
    Customer,
    Agent,
    Department,
    Ticket,
    Response,
    Attachment,
};
