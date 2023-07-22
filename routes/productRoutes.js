const express = require('express');

const authController = require('../controllers/authController');
const productController = require('../controllers/productController');

const { myMulter, fileValidation } = require('../utils/multer');

///////////////////

const router = express.Router();

router.get('/', productController.getAllProductUser);

// Protect all routes after this middleware
router.use(authController.protect);

// restrict all routes after this middleware for only admin
router.use(authController.restrictTo('admin'));

router.post(
  '/',
  myMulter(fileValidation.image).single('image'),
  myMulter(fileValidation.image).array('images', 5), //Maximum 5 images allowed
  productController.checkCreateProductMiddleware,
  productController.configureCloudinary,
  productController.uploadCreateProductImages,
  productController.createProduct
);

router
  .route('/:id')
  .patch(
    myMulter(fileValidation.image).single('image'),
    myMulter(fileValidation.image).array('images', 5), //Maximum 5 images allowed
    productController.configureCloudinary,
    productController.uploadUpdateProductCoverImage,
    productController.uploadUpdateProductImages,
    productController.updateProduct
  )
  .delete(
    productController.configureCloudinary,
    productController.preDeleteProductCoverImageMiddleware,
    productController.preDeleteProductImagesMiddleware,
    productController.deleteProduct
  );

router.get('/all', productController.getAllProductAdmin);

module.exports = router;
