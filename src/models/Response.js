'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Response = sequelize.define('Response', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'tickets', key: 'id' },
    },
    author_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Can be either a customer id or an agent id',
    },
    author_type: {
        type: DataTypes.ENUM('customer', 'agent'),
        allowNull: false,
        defaultValue: 'customer',
        comment: 'Distinguishes whether author is a customer or an agent',
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    is_internal: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Internal notes visible only to agents',
    },
}, {
    tableName: 'responses',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
});

module.exports = Response;
