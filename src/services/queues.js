const BullMQ = require('bullmq');
const { BULLMQ_REDIS_HOST, BULLLMQ_REDIS_PORT } = process.env;

exports.createOrderQueue = new BullMQ.Queue('createOrderQueue', {
  connection: {
    host: `${BULLMQ_REDIS_HOST}`,
    port: `${BULLLMQ_REDIS_PORT}`,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

exports.cancelOrderQueue = new BullMQ.Queue('cancelOrderQueue', {
  connection: {
    host: `${BULLMQ_REDIS_HOST}`,
    port: `${BULLLMQ_REDIS_PORT}`,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

exports.updateOrderQueue = new BullMQ.Queue('updateOrderQueue', {
  connection: {
    host: `${BULLMQ_REDIS_HOST}`,
    port: `${BULLLMQ_REDIS_PORT}`,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});
