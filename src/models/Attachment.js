'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attachment = sequelize.define('Attachment', {
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
    filename: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    file_url: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    uploaded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'attachments',
    timestamps: false,
    underscored: true,
});

module.exports = Attachment;
