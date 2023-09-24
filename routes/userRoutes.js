const express = require('express');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

///////////////////

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.get('/me', userController.GetUser);

router.patch('/me', userController.UpdateUser);

router.post('/address', userController.addAddress);

router.delete('/address/:id', userController.removeAddress);

// router.patch('/updatePassword', authController.updatePassword);
// router.delete('/deleteMe', userController.deleteMe, userController.deleteuser);
// router.delete('/deleteAccount', authController.deleteAccount);

// router.use(authController.restrictTo('admin'));

// router
//   .route('/')
//   .get(userController.GetAllUsers)
//   .post(userController.createuser);

// router
//   .route('/:id')
//   .get(userController.Getuser)
//   .patch(userController.Updateuser)
//   .delete(userController.deleteuser);

// router.get('/me', userController.getMe, userController.Getuser);

module.exports = router;
