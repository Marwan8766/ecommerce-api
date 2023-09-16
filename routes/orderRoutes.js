const express = require('express');

const authController = require('../controllers/authController');
const orderController = require('../controllers/orderController');
const paymobController = require('../controllers/paymobController');

///////////////////

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.get('/', orderController.getAllOrders);

router
  .route('/:id')
  .get(orderController.getOrder)
  .patch(orderController.updateOrderFilterBody, orderController.updateOrder);

router.post(
  '/cancel/:id',
  orderController.cancelOrder,
  orderController.cancelCashPending,
  orderController.cancelCashDeleviery,
  paymobController.authReq,
  orderController.cancelOnlinePending,
  orderController.cancelOnlineDeleviery
);

module.exports = router;
