const express = require('express');

const authController = require('../controllers/authController');
const orderController = require('../controllers/orderController');
const paymobController = require('../controllers/paymobController');

///////////////////

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.get('/', orderController.getAllOrders);

router.get('/:id', orderController.getOrder);

router.post(
  '/cancel/:id',
  orderController.cancelOrder,
  orderController.cancelCashPending,
  orderController.cancelCashDeleviery,
  paymobController.authReq,
  orderController.cancelOnlinePending,
  orderController.cancelOnlineDeleviery
);

router.use(authController.restrictTo('admin'));

router.patch(
  '/:id',
  orderController.updateOrderFilterBody,
  orderController.updateOrder
);

module.exports = router;
