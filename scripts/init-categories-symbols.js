const { databaseLoader } = require('../config/db');
const Category = require('../models/Category.model');
const Symbol = require('../models/Symbol.model');

const initializeCategoriesAndSymbols = async () => {
  try {
    console.log('🔄 Initializing categories and symbols...');
    
    // Wait for database connection
    await databaseLoader();
    
    // Create default categories
    const defaultCategories = [
      {
        name: 'Precious Metals',
        description: 'Gold, Silver, Platinum, and other precious metals',
        icon: 'gem',
        color: '#FFD700',
        sortOrder: 1
      },
      {
        name: 'Forex',
        description: 'Foreign exchange currency pairs',
        icon: 'dollar-sign',
        color: '#00D4AA',
        sortOrder: 2
      },
      {
        name: 'Cryptocurrency',
        description: 'Digital currencies like Bitcoin, Ethereum',
        icon: 'bitcoin',
        color: '#F7931A',
        sortOrder: 3
      },
      {
        name: 'Indices',
        description: 'Stock market indices',
        icon: 'chart-line',
        color: '#6366F1',
        sortOrder: 4
      },
      {
        name: 'Commodities',
        description: 'Oil, Gas, and other commodities',
        icon: 'oil-can',
        color: '#059669',
        sortOrder: 5
      }
    ];
    
    // Create categories
    const createdCategories = [];
    for (const categoryData of defaultCategories) {
      const [category, created] = await Category.findOrCreate({
        where: { name: categoryData.name },
        defaults: categoryData
      });
      
      if (created) {
        console.log(`✅ Created category: ${category.name}`);
      } else {
        console.log(`ℹ️  Category already exists: ${category.name}`);
      }
      
      createdCategories.push(category);
    }
    
    // Find the Precious Metals category for gold
    const preciousMetalsCategory = createdCategories.find(cat => cat.name === 'Precious Metals');
    
    if (!preciousMetalsCategory) {
      throw new Error('Precious Metals category not found');
    }
    
    // Create comprehensive gold symbols with different currencies
    const defaultSymbols = [
      // Major Gold Pairs
      {
        symbol: 'XAUUSD',
        name: 'Gold / US Dollar',
        displayName: 'Gold USD',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'USD',
        pipValue: 10.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 0.64,
        minSpread: 0.50,
        maxSpread: 1.00,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: true,
        sortOrder: 1,
        externalSymbol: 'OANDA:XAU_USD',
        dataProvider: 'OANDA'
      },
      {
        symbol: 'XAU/EUR',
        name: 'Gold / Euro',
        displayName: 'Gold EUR',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'EUR',
        pipValue: 10.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 0.90,
        minSpread: 0.70,
        maxSpread: 1.20,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: true,
        sortOrder: 2,
        externalSymbol: 'OANDA:XAU_EUR',
        dataProvider: 'OANDA'
      },
      {
        symbol: 'XAU/GBP',
        name: 'Gold / British Pound',
        displayName: 'Gold GBP',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'GBP',
        pipValue: 10.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 1.15,
        minSpread: 0.90,
        maxSpread: 1.50,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: true,
        sortOrder: 3,
        externalSymbol: 'OANDA:XAU_GBP',
        dataProvider: 'OANDA'
      },
      {
        symbol: 'XAU/JPY',
        name: 'Gold / Japanese Yen',
        displayName: 'Gold JPY',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'JPY',
        pipValue: 1000.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 85.00,
        minSpread: 70.00,
        maxSpread: 120.00,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: true,
        sortOrder: 4,
        externalSymbol: 'OANDA:XAU_JPY',
        dataProvider: 'OANDA'
      },
      {
        symbol: 'XAU/CHF',
        name: 'Gold / Swiss Franc',
        displayName: 'Gold CHF',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'CHF',
        pipValue: 10.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 0.95,
        minSpread: 0.75,
        maxSpread: 1.25,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: false,
        sortOrder: 5,
        externalSymbol: 'OANDA:XAU_CHF',
        dataProvider: 'OANDA'
      },
      {
        symbol: 'XAU/AUD',
        name: 'Gold / Australian Dollar',
        displayName: 'Gold AUD',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'AUD',
        pipValue: 10.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 1.20,
        minSpread: 0.95,
        maxSpread: 1.55,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: false,
        sortOrder: 6,
        externalSymbol: 'OANDA:XAU_AUD',
        dataProvider: 'OANDA'
      },
      {
        symbol: 'XAU/CAD',
        name: 'Gold / Canadian Dollar',
        displayName: 'Gold CAD',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'CAD',
        pipValue: 10.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 1.10,
        minSpread: 0.85,
        maxSpread: 1.45,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: false,
        sortOrder: 7,
        externalSymbol: 'OANDA:XAU_CAD',
        dataProvider: 'OANDA'
      },
      {
        symbol: 'XAU/NZD',
        name: 'Gold / New Zealand Dollar',
        displayName: 'Gold NZD',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'NZD',
        pipValue: 10.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 1.30,
        minSpread: 1.05,
        maxSpread: 1.65,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: false,
        sortOrder: 8,
        externalSymbol: 'OANDA:XAU_NZD',
        dataProvider: 'OANDA'
      },
      {
        symbol: 'XAU/SGD',
        name: 'Gold / Singapore Dollar',
        displayName: 'Gold SGD',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'SGD',
        pipValue: 10.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 1.25,
        minSpread: 1.00,
        maxSpread: 1.60,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: false,
        sortOrder: 9,
        externalSymbol: 'OANDA:XAU_SGD',
        dataProvider: 'OANDA'
      },
      {
        symbol: 'XAU/HKD',
        name: 'Gold / Hong Kong Dollar',
        displayName: 'Gold HKD',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'HKD',
        pipValue: 10.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 5.20,
        minSpread: 4.50,
        maxSpread: 6.00,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: false,
        sortOrder: 10,
        externalSymbol: 'OANDA:XAU_HKD',
        dataProvider: 'OANDA'
      },
      {
        symbol: 'XAU/CNY',
        name: 'Gold / Chinese Yuan',
        displayName: 'Gold CNY',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'CNY',
        pipValue: 10.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 4.50,
        minSpread: 3.80,
        maxSpread: 5.20,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: false,
        sortOrder: 11,
        externalSymbol: 'OANDA:XAU_CNY',
        dataProvider: 'OANDA'
      },
      {
        symbol: 'XAU/INR',
        name: 'Gold / Indian Rupee',
        displayName: 'Gold INR',
        categoryId: preciousMetalsCategory.id,
        type: 'commodity',
        baseCurrency: 'XAU',
        quoteCurrency: 'INR',
        pipValue: 10.00,
        minLotSize: 0.01,
        maxLotSize: 100.00,
        defaultSpread: 55.00,
        minSpread: 45.00,
        maxSpread: 65.00,
        pricePrecision: 2,
        volumePrecision: 2,
        isActive: true,
        isTradable: true,
        isPopular: false,
        sortOrder: 12,
        externalSymbol: 'OANDA:XAU_INR',
        dataProvider: 'OANDA'
      }
    ];
    
    // Create symbols
    for (const symbolData of defaultSymbols) {
      const [symbol, created] = await Symbol.findOrCreate({
        where: { symbol: symbolData.symbol },
        defaults: symbolData
      });
      
      if (created) {
        console.log(`✅ Created symbol: ${symbol.symbol} (${symbol.name})`);
      } else {
        console.log(`ℹ️  Symbol already exists: ${symbol.symbol}`);
      }
    }
    
    console.log('✅ Categories and symbols initialization completed successfully!');
    console.log(`📊 Created ${createdCategories.length} categories`);
    console.log(`📈 Created ${defaultSymbols.length} symbols`);
    
    // Display summary
    const categoryCount = await Category.count({ where: { isDeleted: false } });
    const symbolCount = await Symbol.count({ where: { isDeleted: false } });
    
    console.log('\n📋 Database Summary:');
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Symbols: ${symbolCount}`);
    
    // Display gold symbols summary
    const goldSymbols = await Symbol.findAll({
      where: {
        baseCurrency: 'XAU',
        isDeleted: false
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name']
      }],
      order: [['sortOrder', 'ASC']]
    });
    
    console.log('\n🥇 Gold Symbols Created:');
    goldSymbols.forEach(symbol => {
      console.log(`   ${symbol.symbol} - ${symbol.name} (${symbol.quoteCurrency})`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error initializing categories and symbols:', error);
    process.exit(1);
  }
};

// Run the initialization
initializeCategoriesAndSymbols();
