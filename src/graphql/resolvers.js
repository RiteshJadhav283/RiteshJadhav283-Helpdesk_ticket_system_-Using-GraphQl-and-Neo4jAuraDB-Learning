'use strict';
const { Op } = require('sequelize');
const {
    Customer,
    Agent,
    Department,
    Ticket,
    Response,
    Attachment,
} = require('../models');

// Priority ordering for sorting: urgent > high > medium > low
const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 };

const resolvers = {
    // ── Query ──────────────────────────────────────────────────────────────────
    Query: {
        // ─── Customers ──────────────────────────────────────────────────────────
        customers: () => Customer.findAll({ order: [['id', 'ASC']] }),

        customer: (_, { id }) => Customer.findByPk(id),

        // ─── Agents ─────────────────────────────────────────────────────────────
        agents: () => Agent.findAll({ order: [['id', 'ASC']] }),

        agent: (_, { id }) => Agent.findByPk(id),

        // ─── Departments ────────────────────────────────────────────────────────
        departments: () => Department.findAll({ order: [['name', 'ASC']] }),

        department: (_, { id }) => Department.findByPk(id),

        // ─── Tickets ────────────────────────────────────────────────────────────
        /**
         * tickets(filter: { status, priority, customerId, assignedTo })
         * Results are ordered by priority (urgent first) then creation date.
         * Test case #1: filter by status
         * Test case #7: priority ordering
         */
        tickets: async (_, { filter = {} }) => {
            const where = {};
            if (filter.status) where.status = filter.status;
            if (filter.priority) where.priority = filter.priority;
            if (filter.customerId) where.customer_id = filter.customerId;
            if (filter.assignedTo) where.assigned_to = filter.assignedTo;

            const tickets = await Ticket.findAll({ where, order: [['created_at', 'DESC']] });

            // Sort by priority (highest first), stable sort preserves created_at order within same priority
            return tickets.sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0));
        },

        ticket: (_, { id }) => Ticket.findByPk(id),

        /**
         * ticketsByCustomer — test case #2: customer sees their tickets
         */
        ticketsByCustomer: async (_, { customerId }) => {
            const tickets = await Ticket.findAll({
                where: { customer_id: customerId },
                order: [['created_at', 'DESC']],
            });
            return tickets.sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0));
        },

        /**
         * ticketsByAgent — test case #3: agent sees their assigned tickets
         */
        ticketsByAgent: async (_, { agentId }) => {
            const tickets = await Ticket.findAll({
                where: { assigned_to: agentId },
                order: [['created_at', 'DESC']],
            });
            return tickets.sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0));
        },

        /**
         * responses — test case #4: ordered by time
         *             test case #5: internal responses hidden when includeInternal=false
         */
        responses: async (_, { ticketId, includeInternal = false }) => {
            const where = { ticket_id: ticketId };
            if (!includeInternal) {
                where.is_internal = false; // hide internal notes from customers
            }
            return Response.findAll({ where, order: [['created_at', 'ASC']] });
        },

        /**
         * attachments — test case #6: attachment tracking per ticket
         */
        attachments: (_, { ticketId }) =>
            Attachment.findAll({
                where: { ticket_id: ticketId },
                order: [['uploaded_at', 'ASC']],
            }),
    },

    // ── Mutation ───────────────────────────────────────────────────────────────
    Mutation: {
        // ─── Customer ───────────────────────────────────────────────────────────
        createCustomer: (_, { input }) => Customer.create(input),

        updateCustomer: async (_, { id, input }) => {
            const customer = await Customer.findByPk(id);
            if (!customer) throw new Error(`Customer ${id} not found`);
            return customer.update(input);
        },

        deleteCustomer: async (_, { id }) => {
            const customer = await Customer.findByPk(id);
            if (!customer) throw new Error(`Customer ${id} not found`);
            await customer.destroy();
            return true;
        },

        // ─── Agent ──────────────────────────────────────────────────────────────
        createAgent: (_, { input }) => Agent.create(input),

        updateAgent: async (_, { id, input }) => {
            const agent = await Agent.findByPk(id);
            if (!agent) throw new Error(`Agent ${id} not found`);
            return agent.update(input);
        },

        deleteAgent: async (_, { id }) => {
            const agent = await Agent.findByPk(id);
            if (!agent) throw new Error(`Agent ${id} not found`);
            await agent.destroy();
            return true;
        },

        // ─── Department ─────────────────────────────────────────────────────────
        createDepartment: (_, { input }) => Department.create(input),

        // ─── Ticket ─────────────────────────────────────────────────────────────
        createTicket: (_, { input }) =>
            Ticket.create({
                title: input.title,
                description: input.description,
                priority: input.priority || 'medium',
                status: 'open',
                customer_id: input.customerId,
            }),

        updateTicket: async (_, { id, input }) => {
            const ticket = await Ticket.findByPk(id);
            if (!ticket) throw new Error(`Ticket ${id} not found`);
            const data = {};
            if (input.title) data.title = input.title;
            if (input.description) data.description = input.description;
            if (input.priority) data.priority = input.priority;
            if (input.status) data.status = input.status;
            if (input.assignedTo !== undefined) data.assigned_to = input.assignedTo;
            return ticket.update(data);
        },

        assignTicket: async (_, { ticketId, agentId }) => {
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
            const agent = await Agent.findByPk(agentId);
            if (!agent) throw new Error(`Agent ${agentId} not found`);
            return ticket.update({ assigned_to: agentId, status: 'in_progress' });
        },

        closeTicket: async (_, { id }) => {
            const ticket = await Ticket.findByPk(id);
            if (!ticket) throw new Error(`Ticket ${id} not found`);
            return ticket.update({ status: 'closed' });
        },

        // ─── Response ───────────────────────────────────────────────────────────
        addResponse: (_, { input }) =>
            Response.create({
                ticket_id: input.ticketId,
                author_id: input.authorId,
                author_type: input.authorType,
                content: input.content,
                is_internal: input.isInternal || false,
            }),

        // ─── Attachment ─────────────────────────────────────────────────────────
        addAttachment: (_, { input }) =>
            Attachment.create({
                ticket_id: input.ticketId,
                filename: input.filename,
                file_url: input.fileUrl,
            }),

        deleteAttachment: async (_, { id }) => {
            const attachment = await Attachment.findByPk(id);
            if (!attachment) throw new Error(`Attachment ${id} not found`);
            await attachment.destroy();
            return true;
        },
    },

    // ── Field Resolvers ────────────────────────────────────────────────────────
    Customer: {
        tickets: (customer) =>
            Ticket.findAll({ where: { customer_id: customer.id }, order: [['created_at', 'DESC']] }),
    },

    Agent: {
        assignedTickets: (agent) =>
            Ticket.findAll({ where: { assigned_to: agent.id }, order: [['created_at', 'DESC']] }),
    },

    Ticket: {
        customer: (ticket) => Customer.findByPk(ticket.customer_id),

        assignedAgent: (ticket) =>
            ticket.assigned_to ? Agent.findByPk(ticket.assigned_to) : null,

        /**
         * Ticket.responses — accepts includeInternal arg directly on field.
         * Test case #5: internal responses hidden from customers
         */
        responses: (ticket, { includeInternal = false }) => {
            const where = { ticket_id: ticket.id };
            if (!includeInternal) where.is_internal = false;
            return Response.findAll({ where, order: [['created_at', 'ASC']] });
        },

        attachments: (ticket) =>
            Attachment.findAll({ where: { ticket_id: ticket.id }, order: [['uploaded_at', 'ASC']] }),

        createdAt: (ticket) => ticket.created_at ? ticket.created_at.toISOString() : null,
        updatedAt: (ticket) => ticket.updated_at ? ticket.updated_at.toISOString() : null,
    },

    Response: {
        ticket: (response) => Ticket.findByPk(response.ticket_id),
        isInternal: (response) => response.is_internal,
        authorId: (response) => response.author_id,
        authorType: (response) => response.author_type,
        createdAt: (response) => response.created_at ? response.created_at.toISOString() : null,
    },

    Attachment: {
        ticket: (attachment) => Ticket.findByPk(attachment.ticket_id),
        fileUrl: (attachment) => attachment.file_url,
        uploadedAt: (attachment) =>
            attachment.uploaded_at ? attachment.uploaded_at.toISOString() : null,
    },
};

module.exports = resolvers;
