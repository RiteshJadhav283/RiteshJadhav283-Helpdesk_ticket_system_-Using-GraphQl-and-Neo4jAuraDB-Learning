'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Agent = sequelize.define('Agent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },
    department: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    role: {
        type: DataTypes.ENUM('agent', 'supervisor', 'admin'),
        allowNull: false,
        defaultValue: 'agent',
    },
}, {
    tableName: 'agents',
    timestamps: true,
    underscored: true,
});

module.exports = Agent;
