// models/Symbol.js
module.exports = (sequelize, DataTypes) => {
    const Symbol = sequelize.define('Symbol', {
      name: { type: DataTypes.STRING, allowNull: false }, // e.g. XAUUSD
      description: { type: DataTypes.STRING },
      minLotSize: { type: DataTypes.DECIMAL(18, 4), defaultValue: 0.01 },
    }, {
      paranoid: true,
      tableName: 'symbols'
    });
  
    return Symbol;
  };
  