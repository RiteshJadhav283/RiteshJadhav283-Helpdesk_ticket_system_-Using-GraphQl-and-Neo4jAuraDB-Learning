'use strict';
/**
 * Helpdesk Ticket System – GraphQL API Test Suite
 *
 * Uses an in-memory SQLite database so no real PostgreSQL is needed.
 * Models are imported AFTER the database module is replaced via Jest's
 * module registry; the mock factory runs at hoist time so we create
 * the Sequelize instance there directly.
 *
 * Covers all 7 expected test cases:
 *  1. Tickets filtered by status
 *  2. Customer sees their tickets
 *  3. Agent sees assigned tickets
 *  4. Responses ordered by time
 *  5. Internal responses hidden from customers
 *  6. Attachment uploads tracked
 *  7. Priority affects ticket ordering
 */

// ── Replace the DB config module with an in-memory SQLite instance ───────────
// The factory must be self-contained (no out-of-scope variables).
jest.mock('../src/config/database', () => {
    const { Sequelize } = require('sequelize');
    return new Sequelize({
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false,
    });
});

const { ApolloServer } = require('@apollo/server');
const typeDefs = require('../src/graphql/typeDefs');
const resolvers = require('../src/graphql/resolvers');
const db = require('../src/config/database');   // the mocked SQLite instance
const {
    Customer,
    Agent,
    Department,
    Ticket,
    Response,
    Attachment,
} = require('../src/models');

// ── Server & DB lifecycle ────────────────────────────────────────────────────
let server;

async function executeOperation(query, variables = {}) {
    const response = await server.executeOperation({ query, variables });
    if (response.body.kind !== 'single') throw new Error('Unexpected response kind');
    return response.body.singleResult;
}

beforeAll(async () => {
    // Create all tables in the in-memory SQLite DB
    await db.sync({ force: true });

    server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
});

afterAll(async () => {
    await server.stop();
    await db.close();
});

beforeEach(async () => {
    // Wipe tables before each test for isolation (order matters for FKs)
    await Response.destroy({ where: {} });
    await Attachment.destroy({ where: {} });
    await Ticket.destroy({ where: {} });
    await Customer.destroy({ where: {} });
    await Agent.destroy({ where: {} });
    await Department.destroy({ where: {} });
});

// ── Seed helpers ─────────────────────────────────────────────────────────────
let _idCounter = 100;
function uniqueEmail(prefix = 'user') {
    return `${prefix}_${++_idCounter}_${Date.now()}@example.com`;
}

async function seedCustomer(overrides = {}) {
    return Customer.create({
        name: 'Alice Smith',
        email: uniqueEmail('alice'),
        company: 'Acme Corp',
        phone: '555-0100',
        ...overrides,
    });
}

async function seedAgent(overrides = {}) {
    return Agent.create({
        name: 'Bob Agent',
        email: uniqueEmail('bob'),
        department: 'Support',
        role: 'agent',
        ...overrides,
    });
}

async function seedTicket(customerId, overrides = {}) {
    return Ticket.create({
        title: 'Test Ticket',
        description: 'Something went wrong.',
        priority: 'medium',
        status: 'open',
        customer_id: customerId,
        ...overrides,
    });
}

// ── Test Cases ───────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// Test Case 1: Tickets filtered by status
// ────────────────────────────────────────────────────────────────────────────
describe('Test Case 1: Tickets filtered by status', () => {
    test('returns only tickets with the requested status', async () => {
        const customer = await seedCustomer();
        await seedTicket(customer.id, { status: 'open' });
        await seedTicket(customer.id, { status: 'resolved' });
        await seedTicket(customer.id, { status: 'open' });

        const result = await executeOperation(`
      query ($filter: TicketFilter) {
        tickets(filter: $filter) { id status }
      }
    `, { filter: { status: 'open' } });

        expect(result.errors).toBeUndefined();
        const tickets = result.data.tickets;
        expect(tickets.length).toBe(2);
        tickets.forEach(t => expect(t.status).toBe('open'));
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Test Case 2: Customer sees their tickets
// ────────────────────────────────────────────────────────────────────────────
describe('Test Case 2: Customer sees their tickets', () => {
    test("ticketsByCustomer returns only the customer's own tickets", async () => {
        const alice = await seedCustomer({ name: 'Alice' });
        const bob = await seedCustomer({ name: 'Bob' });

        await seedTicket(alice.id, { title: 'Alice Ticket 1' });
        await seedTicket(alice.id, { title: 'Alice Ticket 2' });
        await seedTicket(bob.id, { title: 'Bob Ticket 1' });

        const result = await executeOperation(`
      query ($customerId: Int!) {
        ticketsByCustomer(customerId: $customerId) { id title }
      }
    `, { customerId: alice.id });

        expect(result.errors).toBeUndefined();
        const tickets = result.data.ticketsByCustomer;
        expect(tickets.length).toBe(2);
        tickets.forEach(t => expect(t.title).toMatch(/Alice/));
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Test Case 3: Agent sees assigned tickets
// ────────────────────────────────────────────────────────────────────────────
describe('Test Case 3: Agent sees assigned tickets', () => {
    test('ticketsByAgent returns only tickets assigned to that agent', async () => {
        const customer = await seedCustomer();
        const agentA = await seedAgent({ name: 'Agent A' });
        const agentB = await seedAgent({ name: 'Agent B' });

        await seedTicket(customer.id, { assigned_to: agentA.id, title: 'Ticket for A' });
        await seedTicket(customer.id, { assigned_to: agentA.id, title: 'Ticket for A 2' });
        await seedTicket(customer.id, { assigned_to: agentB.id, title: 'Ticket for B' });

        const result = await executeOperation(`
      query ($agentId: Int!) {
        ticketsByAgent(agentId: $agentId) { id title }
      }
    `, { agentId: agentA.id });

        expect(result.errors).toBeUndefined();
        const tickets = result.data.ticketsByAgent;
        expect(tickets.length).toBe(2);
        tickets.forEach(t => expect(t.title).toMatch(/for A/));
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Test Case 4: Responses ordered by time
// ────────────────────────────────────────────────────────────────────────────
describe('Test Case 4: Responses ordered by time', () => {
    test('responses are returned in ascending creation order', async () => {
        const customer = await seedCustomer();
        const ticket = await seedTicket(customer.id);

        // Insert with explicit timestamps
        await Response.create({
            ticket_id: ticket.id, author_id: customer.id, author_type: 'customer',
            content: 'First response', is_internal: false,
            created_at: new Date('2024-01-01T10:00:00Z'),
        });
        await Response.create({
            ticket_id: ticket.id, author_id: customer.id, author_type: 'customer',
            content: 'Second response', is_internal: false,
            created_at: new Date('2024-01-01T11:00:00Z'),
        });
        await Response.create({
            ticket_id: ticket.id, author_id: customer.id, author_type: 'customer',
            content: 'Third response', is_internal: false,
            created_at: new Date('2024-01-01T12:00:00Z'),
        });

        const result = await executeOperation(`
      query ($ticketId: Int!) {
        responses(ticketId: $ticketId, includeInternal: false) {
          id content createdAt
        }
      }
    `, { ticketId: ticket.id });

        expect(result.errors).toBeUndefined();
        const responses = result.data.responses;
        expect(responses.length).toBe(3);
        expect(responses[0].content).toBe('First response');
        expect(responses[1].content).toBe('Second response');
        expect(responses[2].content).toBe('Third response');
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Test Case 5: Internal responses hidden from customers
// ────────────────────────────────────────────────────────────────────────────
describe('Test Case 5: Internal responses hidden from customers', () => {
    test('includeInternal=false excludes internal (agent-only) responses', async () => {
        const customer = await seedCustomer();
        const agent = await seedAgent();
        const ticket = await seedTicket(customer.id);

        await Response.create({
            ticket_id: ticket.id, author_id: customer.id, author_type: 'customer',
            content: 'Public reply from customer', is_internal: false,
        });
        await Response.create({
            ticket_id: ticket.id, author_id: agent.id, author_type: 'agent',
            content: 'Internal agent note', is_internal: true,
        });

        // Customer view: internal hidden
        const customerResult = await executeOperation(`
      query ($ticketId: Int!) {
        responses(ticketId: $ticketId, includeInternal: false) {
          id content isInternal
        }
      }
    `, { ticketId: ticket.id });

        expect(customerResult.errors).toBeUndefined();
        expect(customerResult.data.responses.length).toBe(1);
        expect(customerResult.data.responses[0].isInternal).toBe(false);
        expect(customerResult.data.responses[0].content).toBe('Public reply from customer');

        // Agent view: all responses visible
        const agentResult = await executeOperation(`
      query ($ticketId: Int!) {
        responses(ticketId: $ticketId, includeInternal: true) {
          id content isInternal
        }
      }
    `, { ticketId: ticket.id });

        expect(agentResult.errors).toBeUndefined();
        expect(agentResult.data.responses.length).toBe(2);
        const hasInternal = agentResult.data.responses.some(r => r.isInternal === true);
        expect(hasInternal).toBe(true);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Test Case 6: Attachment uploads tracked
// ────────────────────────────────────────────────────────────────────────────
describe('Test Case 6: Attachment uploads tracked', () => {
    test('attachments are associated with and retrievable by ticket', async () => {
        const customer = await seedCustomer();
        const ticket = await seedTicket(customer.id);

        await Attachment.create({
            ticket_id: ticket.id,
            filename: 'error_log.txt',
            file_url: 'https://storage.example.com/error_log.txt',
        });
        await Attachment.create({
            ticket_id: ticket.id,
            filename: 'screenshot.png',
            file_url: 'https://storage.example.com/screenshot.png',
        });

        const result = await executeOperation(`
      query ($ticketId: Int!) {
        attachments(ticketId: $ticketId) { id filename fileUrl }
      }
    `, { ticketId: ticket.id });

        expect(result.errors).toBeUndefined();
        const attachments = result.data.attachments;
        expect(attachments.length).toBe(2);

        const filenames = attachments.map(a => a.filename);
        expect(filenames).toContain('error_log.txt');
        expect(filenames).toContain('screenshot.png');
        attachments.forEach(a => expect(a.fileUrl).toMatch(/^https:\/\//));
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Test Case 7: Priority affects ticket ordering
// ────────────────────────────────────────────────────────────────────────────
describe('Test Case 7: Priority affects ticket ordering', () => {
    test('tickets are returned with highest priority first', async () => {
        const customer = await seedCustomer();

        await seedTicket(customer.id, { priority: 'low', title: 'Low priority task' });
        await seedTicket(customer.id, { priority: 'urgent', title: 'Urgent task' });
        await seedTicket(customer.id, { priority: 'medium', title: 'Medium priority task' });
        await seedTicket(customer.id, { priority: 'high', title: 'High priority task' });

        const result = await executeOperation(`
      query {
        tickets { id title priority }
      }
    `);

        expect(result.errors).toBeUndefined();
        const tickets = result.data.tickets;
        expect(tickets.length).toBe(4);

        const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 };

        // Verify each ticket is >= the next one in priority
        for (let i = 0; i < tickets.length - 1; i++) {
            expect(PRIORITY_ORDER[tickets[i].priority]).toBeGreaterThanOrEqual(
                PRIORITY_ORDER[tickets[i + 1].priority]
            );
        }

        expect(tickets[0].priority).toBe('urgent');
        expect(tickets[tickets.length - 1].priority).toBe('low');
    });
});
