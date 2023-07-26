const express = require('express');

const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const favouriteController = require('../controllers/favouriteController');

const { myMulter, fileValidation } = require('../utils/multer');

///////////////////

const router = express.Router();

router.get(
  '/',
  productController.authUserProduct,
  productController.getAllProduct
);

router.get(
  '/:id',
  productController.authUserProduct,
  productController.getProduct
);

// Protect all routes after this middleware
router.use(authController.protect);

router
  .route('/favourite/:id')
  .post(favouriteController.addToFavourite)
  .patch(favouriteController.removeFromFavourite);

// restrict all routes after this middleware for only admin
router.use(authController.restrictTo('admin'));

router.post(
  '/',
  myMulter(fileValidation.image),
  productController.checkCreateProductMiddleware,
  productController.configureCloudinary,
  productController.uploadCreateProductImages,
  productController.createProduct
);

router
  .route('/:id')
  .patch(
    myMulter(fileValidation.image),
    productController.configureCloudinary,
    productController.uploadUpdateProductCoverImage,
    productController.uploadUpdateProductImages,
    productController.deleteProductImagesPreUpdate,
    productController.updateProduct
  )
  .delete(
    productController.configureCloudinary,
    productController.preDeleteProductCoverImageMiddleware,
    productController.preDeleteProductImagesMiddleware,
    productController.deleteProduct
  );

module.exports = router;
