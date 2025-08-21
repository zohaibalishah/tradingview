const express = require('express');
const router = express.Router();
const { isMarketOpen } = require('../helpers/marketStatus');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const symbolController = require('../controller/admin/symbol.controller');

// Public routes for market data
router.get('/symbols', symbolController.getPublicSymbols);

// Get current market status
router.get('/status', (req, res) => {
  try {
    const now = dayjs().utc();
    const isOpen = isMarketOpen();
    
    // Calculate next market open/close times
    let nextOpenTime = null;
    let nextCloseTime = null;
    
    if (isOpen) {
      // If market is open, find next close time (Friday 22:00 UTC)
      const currentDay = now.day();
      const currentHour = now.hour();
      
      if (currentDay === 5 && currentHour >= 22) {
        // Market closes Friday 22:00 UTC, reopens Sunday 22:00 UTC
        nextCloseTime = now.day(5).hour(22).minute(0).second(0);
        nextOpenTime = now.day(0).hour(22).minute(0).second(0);
      } else {
        // Market closes Friday 22:00 UTC
        nextCloseTime = now.day(5).hour(22).minute(0).second(0);
      }
    } else {
      // If market is closed, find next open time
      const currentDay = now.day();
      const currentHour = now.hour();
      
      if (currentDay === 6) {
        // Saturday - market opens Sunday 22:00 UTC
        nextOpenTime = now.day(0).hour(22).minute(0).second(0);
      } else if (currentDay === 0 && currentHour < 22) {
        // Sunday before 22:00 UTC - market opens at 22:00 UTC
        nextOpenTime = now.hour(22).minute(0).second(0);
      } else {
        // After Friday close - market opens Sunday 22:00 UTC
        nextOpenTime = now.day(0).hour(22).minute(0).second(0);
      }
    }
    
    const response = {
      isOpen,
      currentTime: now.toISOString(),
      currentTimeUTC: now.format('YYYY-MM-DD HH:mm:ss UTC'),
      nextOpenTime: nextOpenTime ? nextOpenTime.toISOString() : null,
      nextCloseTime: nextCloseTime ? nextCloseTime.toISOString() : null,
      timeUntilNextEvent: null,
      marketHours: {
        open: 'Sunday 22:00 UTC',
        close: 'Friday 22:00 UTC',
        timezone: 'UTC'
      }
    };
    
    // Calculate time until next event
    if (isOpen && nextCloseTime) {
      response.timeUntilNextEvent = {
        type: 'close',
        seconds: Math.max(0, nextCloseTime.diff(now, 'second')),
        formatted: formatTimeRemaining(nextCloseTime.diff(now, 'second'))
      };
    } else if (!isOpen && nextOpenTime) {
      response.timeUntilNextEvent = {
        type: 'open',
        seconds: Math.max(0, nextOpenTime.diff(now, 'second')),
        formatted: formatTimeRemaining(nextOpenTime.diff(now, 'second'))
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error getting market status:', error);
    res.status(500).json({ error: 'Failed to get market status' });
  }
});

// Get market status with countdown
router.get('/status/countdown', (req, res) => {
  try {
    const now = dayjs().utc();
    const isOpen = isMarketOpen();
    
    let timeRemaining = null;
    let eventType = null;
    let lastMarketClose = null;
    
    if (isOpen) {
      // Calculate time until Friday 22:00 UTC
      const nextClose = now.day(5).hour(22).minute(0).second(0);
      if (now.isBefore(nextClose)) {
        timeRemaining = nextClose.diff(now, 'second');
        eventType = 'close';
      }
    } else {
      // Calculate time until next open
      let nextOpen;
      if (now.day() === 6) {
        // Saturday - opens Sunday 22:00 UTC
        nextOpen = now.day(0).hour(22).minute(0).second(0);
      } else if (now.day() === 0 && now.hour() < 22) {
        // Sunday before 22:00 UTC
        nextOpen = now.hour(22).minute(0).second(0);
      } else {
        // After Friday close
        nextOpen = now.day(0).hour(22).minute(0).second(0);
      }
      timeRemaining = nextOpen.diff(now, 'second');
      eventType = 'open';
      
      // Calculate last market close time
      if (now.day() === 6) { // Saturday
        lastMarketClose = now.subtract(1, 'day').hour(22).minute(0).second(0);
      } else if (now.day() === 0) { // Sunday
        lastMarketClose = now.subtract(2, 'day').hour(22).minute(0).second(0);
      } else if (now.day() === 5 && now.hour() >= 22) { // Friday after close
        lastMarketClose = now.hour(22).minute(0).second(0);
      } else {
        // For other days, go back to previous Friday 22:00 UTC
        const daysToSubtract = now.day() === 5 ? 7 : now.day() + 2;
        lastMarketClose = now.subtract(daysToSubtract, 'day').hour(22).minute(0).second(0);
      }
    }
    
    res.json({
      isOpen,
      timeRemaining: Math.max(0, timeRemaining),
      eventType,
      formatted: timeRemaining ? formatTimeRemaining(timeRemaining) : null,
      lastMarketClose: lastMarketClose ? lastMarketClose.toISOString() : null,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Error getting market countdown:', error);
    res.status(500).json({ error: 'Failed to get market countdown' });
  }
});

// Helper function to format time remaining
function formatTimeRemaining(seconds) {
  if (seconds <= 0) return 'Now';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

module.exports = router;
