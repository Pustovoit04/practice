const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // 🔺 змінити шлях, якщо в тебе інший

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  githubId: {
    type: DataTypes.STRING,
    unique: true
  },
  username: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'users', // не обов’язково, але зручно
  timestamps: true
});

module.exports = User;
