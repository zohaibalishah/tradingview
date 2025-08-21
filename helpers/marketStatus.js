// services/marketStatus.js
var dayjs = require("dayjs");
var utc = require("dayjs/plugin/utc.js");
dayjs.extend(utc);

function isMarketOpen() {
  var now = dayjs().utc(); // always check in UTC
  var day = now.day();     // 0 = Sunday, 6 = Saturday
  var hour = now.hour();
  var minute = now.minute();

  // Market closes: Friday 22:00 UTC (5pm EST)
  if (day === 5 && (hour > 21 || (hour === 21 && minute >= 59))) return false;

  // Saturday: closed
  if (day === 6) return false;

  // Sunday: open only after 22:00 UTC
  if (day === 0 && hour < 22) return false;

  return true;
}

module.exports = {
  isMarketOpen: isMarketOpen
};