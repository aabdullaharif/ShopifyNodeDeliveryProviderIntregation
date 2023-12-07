const ErrorHandler = require('../utils/errorHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const {
  createOrderQueue,
  cancelOrderQueue,
  updateOrderQueue,
} = require('../services/queues');

// @desc Get Order from Shopify and push toBullMQ
// @route POST /webhooks/orders/create
// @access PRIVATE - SHOPIFY ONLY
exports.createOrder = asyncHandler(async (req, res, next) => {
  const orderJsonData = req.parsedWebhookData;
  await createOrderQueue.add('createOrderQueue', orderJsonData);
  res.sendStatus(200);
});

// @desc Get Canceled Order from Shopify and push toBullMQ
// @route POST /webhooks/orders/cancel
// @access PRIVATE - SHOPIFY ONLY
exports.cancelOrder = asyncHandler(async (req, res, next) => {
  const orderJsonData = req.parsedWebhookData;
  await cancelOrderQueue.add('cancelOrderQueue', orderJsonData);
  res.sendStatus(200);
});

// @desc Update Order from Shopify and push toBullMQ
// @route POST /webhooks/orders/update
// @access PRIVATE - SHOPIFY ONLY
exports.updateOrder = asyncHandler(async (req, res, next) => {
  const orderJsonData = req.parsedWebhookData;
  await updateOrderQueue.add('updateOrderQueue', orderJsonData);
  res.sendStatus(200);
});
