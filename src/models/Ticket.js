'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
    },
    status: {
        type: DataTypes.ENUM('open', 'in_progress', 'pending', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
    },
    assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'agents', key: 'id' },
    },
}, {
    tableName: 'tickets',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = Ticket;
