export const typeDefs = `

    type Query 
    {
        customers: [Customer!]!
        customer(id:ID!): Customer

        agents: [Agent!]!
        agent(id: ID!): Agent

        tickets: [Ticket!]!
        ticket(id: ID!): Ticket

        departments: [Department!]!
    }

    type Mutation {

        createCustomer(
            id: ID!
            name: String!
            email: String!
            company: String
            phone: String
        ): Customer!

        createAgent(
            id: ID!
            name: String!
            email: String!
            role: String!
            departmentId: ID!
        ): Agent!

        createTicket(
            id: ID!
            title: String!
            description: String!
            priority: Priority!
            customerId: ID!
        ): Ticket!

        assignTicket(
            ticketId: ID!
            agentId: ID!
        ): Ticket!

        updateTicketStatus(
            ticketId: ID!
            status: Status!
        ): Ticket!

        addResponse(
            id: ID!
            ticketId: ID!
            agentId: ID!
            content: String!
            isInternal: Boolean!
        ): Response!

        addAttachment(
            id: ID!
            ticketId: ID!
            filename: String!
            fileUrl: String!
        ): Attachment!
    }

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

    type Customer {
        id: ID!
        name: String!
        email: String!
        company: String
        phone: String
        tickets: [Ticket!]!
    }

    type Agent {
        id: ID!
        name: String!
        email: String!
        role: String!
        department: Department
        assignedTickets: [Ticket!]!
        responses: [Response!]!
    }

    type Ticket {
        id: ID!
        title: String!
        description: String!
        priority: Priority!
        status: Status!
        createdAt: String!
        customer: Customer!
        assignedTo: Agent
        responses: [Response!]!
        attachments: [Attachment!]!
    }

    type Response {
        id: ID!
        content: String!
        createdAt: String!
        isInternal: Boolean!
        ticket: Ticket!
        author: Agent!
    }

    type Attachment {
        id: ID!
        filename: String!
        fileUrl: String!
        uploadedAt: String!
        ticket: Ticket!
    }

    type Department {
        id: ID!
        name: String!
        description: String
        agents: [Agent!]!
    }
`;