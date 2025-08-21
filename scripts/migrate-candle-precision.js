const { sequelize } = require('../config/db');

async function migrateCandlePrecision() {
  try {
    console.log('Starting candle precision migration...');
    
    // Check if the table exists
    const [tables] = await sequelize.query(`
      SHOW TABLES LIKE 'Candles'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Candles table does not exist. Please run your application first to create the table.');
      return;
    }
    
    // Check current column definitions
    const [currentColumns] = await sequelize.query(`
      DESCRIBE \`Candles\`
    `);
    
    console.log('\nCurrent table structure:');
    currentColumns.forEach(row => {
      if (['open', 'high', 'low', 'close'].includes(row.Field)) {
        console.log(`${row.Field}: ${row.Type}`);
      }
    });
    
    // Update the price columns to DECIMAL(15,5)
    console.log('\nUpdating price columns to DECIMAL(15,5)...');
    await sequelize.query(`
      ALTER TABLE \`Candles\` 
      MODIFY COLUMN \`open\` DECIMAL(15,5) NOT NULL,
      MODIFY COLUMN \`high\` DECIMAL(15,5) NOT NULL,
      MODIFY COLUMN \`low\` DECIMAL(15,5) NOT NULL,
      MODIFY COLUMN \`close\` DECIMAL(15,5) NOT NULL
    `);
    
    console.log('✅ Successfully updated Candle table price columns to DECIMAL(15,5)');
    
    // Verify the changes
    const [updatedColumns] = await sequelize.query(`
      DESCRIBE \`Candles\`
    `);
    
    console.log('\nUpdated table structure:');
    updatedColumns.forEach(row => {
      if (['open', 'high', 'low', 'close'].includes(row.Field)) {
        console.log(`${row.Field}: ${row.Type}`);
      }
    });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('The database can now handle larger price values like XAU_JPY (492,948 JPY).');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('This might mean the columns are already updated. Check the table structure above.');
    }
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateCandlePrecision()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateCandlePrecision;
