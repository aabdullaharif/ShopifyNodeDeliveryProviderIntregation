const express = require('express');
const { verifyWebhook } = require('../middlewares/verifyWebhook');
const {
  createOrder,
  cancelOrder,
  updateOrder,
} = require('../controllers/orderController');
const router = express.Router();

router.route('/create').post(verifyWebhook, createOrder);
router.route('/cancel').post(verifyWebhook, cancelOrder);
router.route('/update').post(verifyWebhook, updateOrder);

module.exports = router;
