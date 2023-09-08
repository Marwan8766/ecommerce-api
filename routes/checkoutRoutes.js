const express = require('express');

const authController = require('../controllers/authController');
const checkoutController = require('../controllers/checkoutController');

///////////////////

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.post('/', checkoutController.preCheckout);

router.post(
  '/:orderId',
  checkoutController.checkoutCash,
  checkoutController.checkoutOnline
);

module.exports = router;
