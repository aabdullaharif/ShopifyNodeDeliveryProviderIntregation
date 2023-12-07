require('dotenv').config();
const app = require('./app');
const connectDB = require('./src/config/db');
const { PORT, NODE_ENV } = process.env;

// Uncaught Expections
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  console.log('Shutting down the server, Uncaught Exceptions');
  process.exit(1);
});

connectDB();

const server = app.listen(PORT, () => {
  console.log(`Server is started in ${NODE_ENV} at PORT:${PORT}`);
});

// Unhandled Promise Rejection
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  console.log('Shutting down the server, Unhandled Promise Rejection');

  server.close(() => {
    process.exit(1);
  });
});
