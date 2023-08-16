const express = require('express');

const authController = require('../controllers/authController');
const couponController = require('../controllers/couponController');

///////////////////

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Protect all routes after this middleware to be for admins only
router.use(authController.restrictTo('admin'));

// create coupon
router.post('/', couponController.createCoupon);

// get all coupons
router.get('/', couponController.getAllCoupon);

// update coupon
// delete coupon
router
  .route('/:id')
  .patch(couponController.updateCoupon)
  .delete(couponController.deleteCoupon);

module.exports = router;
