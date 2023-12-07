const express = require('express');
const errorMiddleware = require('./src/middlewares/error');
const app = express();

const orderRoute = require('./src/routes/ordersRoute');
require('./src/services/createOrderworker');
require('./src/services/cancelOrderWorker');
// require('./src/services/updateOrderWorker');
const { refreshAuthToken, accessAuthToken } = require('./src/services/auth');

app.use('/webhooks/orders', orderRoute);

const schedule = require('node-schedule');

// TODO: Cron Job - 6 Months
schedule.scheduleJob('0 0 1 */6 *', () => {
  console.log('Cron 6 Months');
  refreshAuthToken();
  console.log(new Date().toLocaleString());
});

// TODO: Cron Job - 24 Hours
schedule.scheduleJob('0 0 * * *', () => {
  console.log('Cron 24 Hours');
  accessAuthToken();
  console.log(new Date().toLocaleString());
});

// Error Middleware
app.use(errorMiddleware);
module.exports = app;
