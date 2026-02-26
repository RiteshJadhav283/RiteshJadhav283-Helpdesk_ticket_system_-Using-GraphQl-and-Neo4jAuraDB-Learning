'use strict';
const { gql } = require('graphql-tag');

const typeDefs = gql`
  # ── Enums ─────────────────────────────────────────────────────────────
  enum Priority {
    low
    medium
    high
    urgent
  }

  enum Status {
    open
    in_progress
    pending
    resolved
    closed
  }

  enum AgentRole {
    agent
    supervisor
    admin
  }

  enum AuthorType {
    customer
    agent
  }

  # ── Types ─────────────────────────────────────────────────────────────
  type Customer {
    id: ID!
    name: String!
    email: String!
    company: String
    phone: String
    tickets: [Ticket!]!
    createdAt: String
    updatedAt: String
  }

  type Agent {
    id: ID!
    name: String!
    email: String!
    department: String
    role: AgentRole!
    assignedTickets: [Ticket!]!
    createdAt: String
    updatedAt: String
  }

  type Department {
    id: ID!
    name: String!
    description: String
    createdAt: String
    updatedAt: String
  }

  type Ticket {
    id: ID!
    title: String!
    description: String!
    priority: Priority!
    status: Status!
    customer: Customer!
    assignedAgent: Agent
    responses(includeInternal: Boolean): [Response!]!
    attachments: [Attachment!]!
    createdAt: String!
    updatedAt: String
  }

  type Response {
    id: ID!
    ticket: Ticket!
    authorId: Int!
    authorType: AuthorType!
    content: String!
    isInternal: Boolean!
    createdAt: String!
  }

  type Attachment {
    id: ID!
    ticket: Ticket!
    filename: String!
    fileUrl: String!
    uploadedAt: String!
  }

  # ── Input Types ───────────────────────────────────────────────────────
  input CreateCustomerInput {
    name: String!
    email: String!
    company: String
    phone: String
  }

  input CreateAgentInput {
    name: String!
    email: String!
    department: String
    role: AgentRole
  }

  input CreateDepartmentInput {
    name: String!
    description: String
  }

  input CreateTicketInput {
    title: String!
    description: String!
    priority: Priority
    customerId: Int!
  }

  input UpdateTicketInput {
    title: String
    description: String
    priority: Priority
    status: Status
    assignedTo: Int
  }

  input AddResponseInput {
    ticketId: Int!
    authorId: Int!
    authorType: AuthorType!
    content: String!
    isInternal: Boolean
  }

  input AddAttachmentInput {
    ticketId: Int!
    filename: String!
    fileUrl: String!
  }

  # ── Filters ───────────────────────────────────────────────────────────
  input TicketFilter {
    status: Status
    priority: Priority
    customerId: Int
    assignedTo: Int
  }

  # ── Queries ───────────────────────────────────────────────────────────
  type Query {
    # Customers
    customers: [Customer!]!
    customer(id: ID!): Customer

    # Agents
    agents: [Agent!]!
    agent(id: ID!): Agent

    # Departments
    departments: [Department!]!
    department(id: ID!): Department

    # Tickets — filterable by status, priority, customer, agent
    tickets(filter: TicketFilter): [Ticket!]!
    ticket(id: ID!): Ticket

    # Customer-scoped tickets
    ticketsByCustomer(customerId: Int!): [Ticket!]!

    # Agent-scoped assigned tickets
    ticketsByAgent(agentId: Int!): [Ticket!]!

    # Responses for a ticket (includeInternal = false hides agent notes)
    responses(ticketId: Int!, includeInternal: Boolean): [Response!]!

    # Attachments for a ticket
    attachments(ticketId: Int!): [Attachment!]!
  }

  # ── Mutations ─────────────────────────────────────────────────────────
  type Mutation {
    # Customer CRUD
    createCustomer(input: CreateCustomerInput!): Customer!
    updateCustomer(id: ID!, input: CreateCustomerInput!): Customer!
    deleteCustomer(id: ID!): Boolean!

    # Agent CRUD
    createAgent(input: CreateAgentInput!): Agent!
    updateAgent(id: ID!, input: CreateAgentInput!): Agent!
    deleteAgent(id: ID!): Boolean!

    # Department CRUD
    createDepartment(input: CreateDepartmentInput!): Department!

    # Ticket CUD
    createTicket(input: CreateTicketInput!): Ticket!
    updateTicket(id: ID!, input: UpdateTicketInput!): Ticket!
    assignTicket(ticketId: Int!, agentId: Int!): Ticket!
    closeTicket(id: ID!): Ticket!

    # Responses
    addResponse(input: AddResponseInput!): Response!

    # Attachments
    addAttachment(input: AddAttachmentInput!): Attachment!
    deleteAttachment(id: ID!): Boolean!
  }
`;

module.exports = typeDefs;
