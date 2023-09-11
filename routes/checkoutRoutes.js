const express = require('express');

const authController = require('../controllers/authController');
const checkoutController = require('../controllers/checkoutController');
const paymobController = require('../controllers/paymobController');

///////////////////

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.post('/', checkoutController.preCheckout);

router.post(
  '/:orderId',
  checkoutController.checkoutCash,
  paymobController.authReq,
  paymobController.orderRegister,
  paymobController.paymentKeyReq,
  paymobController.cardPayment,
  paymobController.kioskPayment,
  paymobController.walletPayment,
  paymobController.valuPayment
);

module.exports = router;
