require('dotenv').config();
const ErrorHandler = require('../utils/errorHandler');
const asyncHandler = require('./asyncHandler');
const crypto = require('crypto');
const getRawBody = require('raw-body');
const { SHOPIFY_WEBHOOK_SECRET_KEY } = process.env;

exports.verifyWebhook = asyncHandler(async (req, res, next) => {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const body = await getRawBody(req);

  const hash = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET_KEY)
    .update(body, 'utf8')
    .digest('base64');

  if (hash === hmac) {
    console.log('Phew, it came from Shopify!');
    req.parsedWebhookData = JSON.parse(body);
    next();
  } else {
    console.log('Danger! Not from Shopify!');
    return next(new ErrorHandler('Danger! Not from Shopify!'), 403);
  }
});
