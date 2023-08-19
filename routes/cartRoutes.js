const express = require('express');

const authController = require('../controllers/authController');
const cartController = require('../controllers/cartController');

///////////////////

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router
  .route('/')
  .post(cartController.checkProductItemAvailability, cartController.addToCart)
  .get(cartController.getCart);

router.use('/item/:itemId', cartController.removeFromCart);

module.exports = router;
