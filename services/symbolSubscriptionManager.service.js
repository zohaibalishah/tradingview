const Symbol = require('../models/Symbol.model');
const Category = require('../models/Category.model');

class SymbolSubscriptionManager {
  constructor() {
    this.currentSubscriptions = new Set(); // Track currently subscribed symbols
    this.websocket = null; // Reference to WebSocket connection
    this.isConnected = false;
    this.subscriptionCallbacks = []; // Callbacks to notify when subscriptions change
  }

  // Set WebSocket reference
  setWebSocket(websocket) {
    this.websocket = websocket;
  }

  // Set connection status
  setConnectionStatus(connected) {
    this.isConnected = connected;
  }

  // Add callback for subscription changes
  onSubscriptionChange(callback) {
    this.subscriptionCallbacks.push(callback);
  }

  // Notify all callbacks of subscription changes
  notifySubscriptionChange(action, symbols) {
    this.subscriptionCallbacks.forEach(callback => {
      try {
        callback(action, symbols);
      } catch (error) {
        console.error('Error in subscription change callback:', error);
      }
    });
  }

  // Get all active gold symbols from database
  async getActiveGoldSymbols() {
    try {
      const symbols = await Symbol.findAll({
        where: {
          baseCurrency: 'XAU',
          isActive: true,
          isDeleted: false
        },
        include: [{
          model: Category,
          as: 'category',
          attributes: ['name']
        }],
        order: [['sortOrder', 'ASC']]
      });

      // Convert symbols to Finnhub format
      const finnhubSymbols = symbols.map(symbol => {
        const quoteCurrency = symbol.quoteCurrency;
        return `OANDA:XAU_${quoteCurrency}`;
      });

      console.log(`📊 Found ${finnhubSymbols.length} active gold symbols:`, finnhubSymbols);
      return finnhubSymbols;
    } catch (error) {
      console.error('❌ Error fetching active gold symbols:', error);
      return [];
    }
  }

  // Subscribe to a specific symbol
  async subscribeToSymbol(symbolCode) {
    if (!this.isConnected || !this.websocket) {
      console.warn('⚠️ WebSocket not connected, cannot subscribe to symbol:', symbolCode);
      return false;
    }

    try {
      // Convert symbol to Finnhub format if needed
      const finnhubSymbol = this.convertToFinnhubFormat(symbolCode);
      
      // Send subscription message
      this.websocket.send(JSON.stringify({ type: 'subscribe', symbol: finnhubSymbol }));
      console.log(`📡 Subscribed to symbol: ${finnhubSymbol}`);
      
      // Add to current subscriptions
      this.currentSubscriptions.add(finnhubSymbol);
      
      // Notify callbacks
      this.notifySubscriptionChange('subscribed', [finnhubSymbol]);
      
      return true;
    } catch (error) {
      console.error('❌ Error subscribing to symbol:', symbolCode, error);
      return false;
    }
  }

  // Unsubscribe from a specific symbol
  async unsubscribeFromSymbol(symbolCode) {
    if (!this.isConnected || !this.websocket) {
      console.warn('⚠️ WebSocket not connected, cannot unsubscribe from symbol:', symbolCode);
      return false;
    }

    try {
      // Convert symbol to Finnhub format if needed
      const finnhubSymbol = this.convertToFinnhubFormat(symbolCode);
      
      // Send unsubscription message
      this.websocket.send(JSON.stringify({ type: 'unsubscribe', symbol: finnhubSymbol }));
      console.log(`📡 Unsubscribed from symbol: ${finnhubSymbol}`);
      
      // Remove from current subscriptions
      this.currentSubscriptions.delete(finnhubSymbol);
      
      // Notify callbacks
      this.notifySubscriptionChange('unsubscribed', [finnhubSymbol]);
      
      return true;
    } catch (error) {
      console.error('❌ Error unsubscribing from symbol:', symbolCode, error);
      return false;
    }
  }

  // Refresh all subscriptions based on current database state
  async refreshSubscriptions() {
    if (!this.isConnected || !this.websocket) {
      console.warn('⚠️ WebSocket not connected, cannot refresh subscriptions');
      return false;
    }

    try {
      console.log('🔄 Refreshing symbol subscriptions...');
      
      // Get current active symbols from database
      const activeSymbols = await this.getActiveGoldSymbols();
      
      // Get currently subscribed symbols
      const currentSymbols = Array.from(this.currentSubscriptions);
      
      // Find symbols to unsubscribe (in current but not in active)
      const symbolsToUnsubscribe = currentSymbols.filter(symbol => !activeSymbols.includes(symbol));
      
      // Find symbols to subscribe (in active but not in current)
      const symbolsToSubscribe = activeSymbols.filter(symbol => !currentSymbols.includes(symbol));
      
      console.log(`📊 Subscription refresh: +${symbolsToSubscribe.length} -${symbolsToUnsubscribe.length}`);
      
      // Unsubscribe from removed symbols
      for (const symbol of symbolsToUnsubscribe) {
        await this.unsubscribeFromSymbol(symbol);
      }
      
      // Subscribe to new symbols
      for (const symbol of symbolsToSubscribe) {
        await this.subscribeToSymbol(symbol);
      }
      
      // Notify callbacks of refresh
      this.notifySubscriptionChange('refreshed', {
        added: symbolsToSubscribe,
        removed: symbolsToUnsubscribe,
        total: activeSymbols
      });
      
      console.log('✅ Symbol subscriptions refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error refreshing subscriptions:', error);
      return false;
    }
  }

  // Handle symbol creation
  async handleSymbolCreated(symbolData) {
    console.log('🆕 Symbol created, checking if subscription needed:', symbolData.symbol);
    
    // Check if this is a gold symbol that should be subscribed
    if (symbolData.baseCurrency === 'XAU' && symbolData.isActive) {
      await this.subscribeToSymbol(symbolData.symbol);
    }
  }

  // Handle symbol update
  async handleSymbolUpdated(symbolData) {
    console.log('✏️ Symbol updated, checking subscription status:', symbolData.symbol);
    
    const finnhubSymbol = this.convertToFinnhubFormat(symbolData.symbol);
    const isCurrentlySubscribed = this.currentSubscriptions.has(finnhubSymbol);
    
    if (symbolData.baseCurrency === 'XAU' && symbolData.isActive) {
      // Should be subscribed
      if (!isCurrentlySubscribed) {
        await this.subscribeToSymbol(symbolData.symbol);
      }
    } else {
      // Should not be subscribed
      if (isCurrentlySubscribed) {
        await this.unsubscribeFromSymbol(symbolData.symbol);
      }
    }
  }

  // Handle symbol deletion
  async handleSymbolDeleted(symbolData) {
    console.log('🗑️ Symbol deleted, unsubscribing if needed:', symbolData.symbol);
    
    // Unsubscribe if currently subscribed
    const finnhubSymbol = this.convertToFinnhubFormat(symbolData.symbol);
    if (this.currentSubscriptions.has(finnhubSymbol)) {
      await this.unsubscribeFromSymbol(symbolData.symbol);
    }
  }

  // Handle symbol status change
  async handleSymbolStatusChanged(symbolData) {
    console.log('🔄 Symbol status changed, updating subscription:', symbolData.symbol);
    
    const finnhubSymbol = this.convertToFinnhubFormat(symbolData.symbol);
    const isCurrentlySubscribed = this.currentSubscriptions.has(finnhubSymbol);
    
    if (symbolData.baseCurrency === 'XAU' && symbolData.isActive) {
      // Should be subscribed
      if (!isCurrentlySubscribed) {
        await this.subscribeToSymbol(symbolData.symbol);
      }
    } else {
      // Should not be subscribed
      if (isCurrentlySubscribed) {
        await this.unsubscribeFromSymbol(symbolData.symbol);
      }
    }
  }

  // Convert symbol to Finnhub format
  convertToFinnhubFormat(symbolCode) {
    // If already in Finnhub format, return as is
    if (symbolCode.includes('OANDA:')) {
      return symbolCode;
    }
    
    // Convert XAU/USD format to OANDA:XAU_USD
    if (symbolCode.includes('/')) {
      return `OANDA:${symbolCode.replace('/', '_')}`;
    }
    
    // Convert XAUUSD format to OANDA:XAU_USD
    if (symbolCode.startsWith('XAU')) {
      const quoteCurrency = symbolCode.substring(3);
      return `OANDA:XAU_${quoteCurrency}`;
    }
    
    // Default: assume it's already in the right format
    return symbolCode;
  }

  // Get current subscription status
  getSubscriptionStatus() {
    return {
      isConnected: this.isConnected,
      totalSubscriptions: this.currentSubscriptions.size,
      subscriptions: Array.from(this.currentSubscriptions),
      callbacks: this.subscriptionCallbacks.length
    };
  }

  // Cleanup method
  cleanup() {
    console.log('🧹 Cleaning up symbol subscription manager...');
    this.currentSubscriptions.clear();
    this.subscriptionCallbacks = [];
    this.websocket = null;
    this.isConnected = false;
    console.log('✅ Symbol subscription manager cleaned up');
  }
}

module.exports = new SymbolSubscriptionManager();
