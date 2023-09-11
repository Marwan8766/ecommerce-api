const express = require('express');

const paymobController = require('../controllers/paymobController');

///////////////////

const router = express.Router();

router.post('/webhook', paymobController.transactionsWebhook);

module.exports = router;
