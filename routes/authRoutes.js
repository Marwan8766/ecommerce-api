const express = require('express');

const authController = require('../controllers/authController');

///////////////////

const router = express.Router();

router.post('/signup', authController.preSignup, authController.signup);
router.post('/confirmEmail', authController.confirmEmail);

router.post('/resendOtp', authController.resendEmailConfirmOtp);

router.post('/login', authController.login);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

router.post('/logout', authController.logout);
router.patch('/updatePassword', authController.updatePassword);

module.exports = router;
