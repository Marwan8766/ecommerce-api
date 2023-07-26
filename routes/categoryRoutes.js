const express = require('express');

const authController = require('../controllers/authController');
const categoryController = require('../controllers/categoryController');

const { myMulter, fileValidation } = require('../utils/multer');

///////////////////

const router = express.Router();

router.get('/', categoryController.getAllCategory);

// Protect all routes after this middleware
router.use(authController.protect);

// restrict all routes after this middleware for only admin
router.use(authController.restrictTo('admin'));

router.post(
  '/',
  // myMulter(fileValidation.image).single('image'),
  categoryController.checkCreateCategoryMiddleware,
  categoryController.configureCloudinary,
  categoryController.createCategory
);

router
  .route('/:id')
  .patch(
    // myMulter(fileValidation.image).single('image'),
    categoryController.configureCloudinary,
    categoryController.uploadUpdateCategoryImage,
    categoryController.updateCategory
  )
  .delete(
    categoryController.configureCloudinary,
    categoryController.preDeleteImageMiddleware,
    categoryController.deleteCategory
  );

module.exports = router;
