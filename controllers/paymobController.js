const Cart = require('../models/cartModel');
const orderModel = require('../models/orderModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const axios = require('axios');
const crypto = require('crypto');
const createOrderEmail = require('../utils/createOrderEmail');
const User = require('../models/userModel');
const sendMail = require('../utils/email');
const { AsyncResource } = require('async_hooks');

/* 
1. Authentication Request:
 The Authentication request is an elementary step you should do before dealing with any of Accept's APIs.
It is a post request with a JSON object which contains your api_key found in your dashboard 
*/
exports.authReq = catchAsync(async (req, res, next) => {
  try {
    // Define the URL and request data
    const url = 'https://accept.paymob.com/api/auth/tokens';
    const requestData = {
      api_key: process.env.PAYMOB_API_KEY,
    };

    // Make the POST request to authenticate
    const response = await axios.post(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Check if the request was successful
    if (response.status !== 200) {
      console.error('Authentication failed. Status Code:', response.status);
      return next(new AppError('Something went wrong', 500));
    }

    const token = response.data.token;
    console.log('Authentication Successful. Token:', token);
    req.paymobAuthToken = token;
    next();
  } catch (error) {
    console.error('Error:', error.message);
    return next(new AppError('Something went wrong', 500));
  }
});

/*
2. Order Registration API
At this step, you will register an order to Accept's database, so that you can pay for it later using a transaction.
Order ID will be the identifier that you will use to link the transaction(s) performed to your system, as one order can have more than one transaction.
*/
exports.orderRegister = catchAsync(async (req, res, next) => {
  try {
    // get the required data from the req
    const { paymobAuthToken, order } = req;

    // create the items array for the paymob order
    const orderItems = order.items.map((item) => {
      return {
        name: item.productName,
        amount_cents: item.price * (1 - item.discount) * 100,
        description: item.productDescription,
        quantity: item.quantity,
      };
    });

    // Define the URL and request data
    const url = 'https://accept.paymob.com/api/ecommerce/orders';
    const requestData = {
      auth_token: paymobAuthToken,
      delivery_needed: false,
      amount_cents: order.totalPrice,
      currency: 'EGP',
      merchant_order_id: order._id,
      items: orderItems,
    };

    // Make the POST request to register the order
    const response = await axios.post(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Handle the response as needed
    if (response.status !== 200) {
      console.error('Order Registration Failed. Status Code:', response.status);
      return next(new AppError('Something went wrong', 500));
    }

    console.log('Order Registration Successful:', response.data);
    req.paymobOrderId = response.data.id;
    next();
  } catch (error) {
    console.error('Error:', error.message);
    return next(new AppError('Something went wrong', 500));
  }
});

/*
3. Payment Key Request
At this step, you will obtain a payment_key token. This key will be used to authenticate your payment request. It will be also used for verifying your transaction request metadata.
*/
exports.paymentKeyReq = catchAsync(async (req, res, next) => {
  try {
    // get the required data from the req
    const { paymobAuthToken, order, paymobOrderId, user } = req;

    // get the integration id
    const { paymentMethodType } = req.body;

    const integrationIdObj = {
      card: process.env.PAYMOB_CARD_INTEGRATION_ID,
      wallet: process.env.PAYMOB_WALLET_INTEGRATION_ID,
      kiosk: process.env.PAYMOB_KIOSK_INTEGRATION_ID,
    };

    const integrationId = integrationIdObj[paymentMethodType];
    if (!integrationId)
      return next(
        new AppError('You must provide your paymentMethodType correctly', 400)
      );

    // Define the URL and request data
    const url = 'https://accept.paymob.com/api/acceptance/payment_keys';
    const requestData = {
      auth_token: paymobAuthToken,
      amount_cents: order.totalPrice * 100,
      expiration: 3600,
      order_id: paymobOrderId,
      billing_data: {
        apartment: order.address.apartmentNumber,
        email: user.email,
        floor: order.address.floorNumber,
        first_name: user.firstName,
        street: order.address.street,
        building: order.address.buildingNumber,
        phone_number: user.phoneNumber,
        shipping_method: 'NA',
        postal_code: 'NA',
        city: order.address.city,
        country: 'EG',
        last_name: user.lastName,
        state: 'NA',
      },
      currency: 'EGP',
      integration_id: +integrationId,
      lock_order_when_paid: true,
    };

    // Make the POST request to register the order
    const response = await axios.post(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Handle the response as needed
    if (response.status !== 200) {
      console.error(
        'Payment_Key Registeration Failed. Status Code:',
        response.status
      );
      return next(new AppError('Something went wrong', 500));
    }

    console.log('Payment_Key Registeration Successful:', response.data);
    req.paymobPaymentToken = response.data.token;
    next();
  } catch (error) {
    console.error('Error:', error.message);
    return next(new AppError('Something went wrong', 500));
  }
});

// Middleware to handle credit card payment
exports.cardPayment = catchAsync(async (req, res, next) => {
  const { paymentMethodType } = req.body;
  const { paymobPaymentToken } = req;

  // check that the paymentMethodType is card
  if (paymentMethodType !== 'card') return next();

  // create the iframe url to redirect the user to
  const redirect_iframe_url = `https://accept.paymobsolutions.com/api/acceptance/iframes/${+process
    .env.PAYMOB_CARD_IFRAME_ID}?payment_token=${paymobPaymentToken}`;

  return res.status(200).json({
    status: 'success',
    message: 'complete the payment on this url',
    redirect_iframe_url,
  });
});

// middleware to handle kiosk payment
exports.kioskPayment = catchAsync(async (req, res, next) => {
  try {
    const { paymentMethodType } = req.body;
    const { paymobPaymentToken, user } = req;

    // check that the paymentMethodType is kiosk
    if (paymentMethodType !== 'kiosk') return next();

    // Define the URL and request data
    const url = 'https://accept.paymob.com/api/acceptance/payments/pay';
    const requestData = {
      source: {
        identifier: 'AGGREGATOR',
        subtype: 'AGGREGATOR',
      },
      payment_token: paymobPaymentToken,
    };

    // Make the POST request to register the transaction
    const response = await axios.post(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Handle the response as needed
    if (response.status !== 200) {
      console.error(
        'kiosk payment Registration Failed. Status Code:',
        response.status
      );
      return next(new AppError('Something went wrong', 500));
    }

    console.log('kiosk payment Registration Successful:', response.data);
    const { bill_reference } = response.data.data;

    // send email with the instructions to the user
    const optionsObj = createOrderEmail.createPaymentInstructionsEmail(
      user,
      bill_reference
    );
    await sendMail(optionsObj);

    // return success res with the data
    return res.status(200).json({
      status: 'success',
      message:
        'tell customers to ask for Madfouaat Mutanouea Accept مدفوعات متنوعة اكسبت and give their reference number.',
      bill_reference,
    });
  } catch (error) {
    console.error('Error:', error.message);
    return next(new AppError('Something went wrong', 500));
  }
});

// middleware to handle mobile wallet payment
exports.walletPayment = catchAsync(async (req, res, next) => {
  try {
    const { paymentMethodType } = req.body;
    const { paymobPaymentToken } = req;

    // check that the paymentMethodType is wallet
    if (paymentMethodType !== 'wallet') return next();

    // Define the URL and request data
    const url = 'https://accept.paymob.com/api/acceptance/payments/pay';
    const requestData = {
      source: {
        identifier: 'wallet mobile number',
        subtype: 'WALLET',
      },
      payment_token: paymobPaymentToken,
    };

    // Make the POST request to register the transaction
    const response = await axios.post(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Handle the response as needed
    if (response.status !== 200) {
      console.error(
        'wallet payment Registration Failed. Status Code:',
        response.status
      );
      return next(new AppError('Something went wrong', 500));
    }

    console.log('wallet payment Registration Successful:', response.data);
    const { redirect_url } = response.data;

    return res.status(200).json({
      status: 'success',
      message: 'use this url to complete the payment',
      redirect_url,
    });
  } catch (error) {
    console.error('Error:', error.message);
    return next(new AppError('Something went wrong', 500));
  }
});

// middleware to handle mobile valu payment
exports.valuPayment = catchAsync(async (req, res, next) => {
  const { paymentMethodType } = req.body;
  const { paymobPaymentToken } = req;

  // check that the paymentMethodType is card
  if (paymentMethodType !== 'valu')
    return next(new AppError('Incorrect paymentMethodType', 400));

  // create the iframe url to redirect the user to
  const redirect_iframe_url = `https://accept.paymobsolutions.com/api/acceptance/iframes/${+process
    .env.PAYMOB_VALU_IFRAME_ID}?payment_token=${paymobPaymentToken}`;

  return res.status(200).json({
    status: 'success',
    message: 'complete the payment on this url',
    redirect_iframe_url,
  });
});

exports.transactionsWebhook = catchAsync(async (req, res, next) => {
  // check if the req is authenticated
  if (!calculateCompareHMAC(req.body, process.env.PAYMOB_HMAC, req.query.hmac))
    return res.status(401).json({ message: 'Unauthorized' });

  // else the req is authenticated check if success or fail and handle both

  // transaction failed
  // return
  if (!req.body.success) return;

  // transaction success

  // pay transaction
  if (!req.body.is_refunded) {
    await payWebhookHandler(req.body);
    return res.status(200);
  }

  // refund transaction
  await refundWebhookHandler(req.body);

  return res.status(200);
});

const payWebhookHandler = async (data) => {
  // make an array to hold the prmises
  const promises = [];

  // find the order
  const order = await orderModel.findById(data.order.merchant_order_id);
  if (!order) return next(new AppError('order not found', 404));

  // empty the user cart
  const userId = order.user;
  const cart = await Cart.findOne({ user: userId });
  cart.items = [];
  promises.push(cart.save({ validateModifiedOnly: true }));

  // update the order
  order.status = 'pending';
  order.paymobOrderId = data.order.id;
  order.paymobPayTransactionId = data.id;
  promises.push(order.save({ validateModifiedOnly: true }));

  // send email to the user
  const user = await User.findById(userId);
  const optionsObj = createOrderEmail.createOrderConfirmationEmail(order, user);
  promises.push(sendMail(optionsObj));

  // run all the promises in parallel
  await Promise.all(promises);
};

const refundWebhookHandler = async (data) => {};

const calculateCompareHMAC = (data, hmacSecret, receivedHmac) => {
  // Define the keys that should be included in the HMAC calculation
  const keysForHMAC = [
    'amount_cents',
    'created_at',
    'currency',
    'error_occured',
    'has_parent_transaction',
    'id',
    'integration_id',
    'is_3d_secure',
    'is_auth',
    'is_capture',
    'is_refunded',
    'is_standalone_payment',
    'is_voided',
    'order.id',
    'owner',
    'pending',
    'source_data.pan',
    'source_data.sub_type',
    'source_data.type',
    'success',
  ];

  // Sort the keys lexicographically
  keysForHMAC.sort();

  // Concatenate the values of sorted keys
  const concatenatedString = keysForHMAC.map((key) => data[key] || '').join('');

  // Calculate the HMAC using SHA512 and the provided HMAC secret
  const hmac = crypto.createHmac('sha512', hmacSecret);
  hmac.update(concatenatedString);
  const calculatedHMAC = hmac.digest('hex');

  return calculatedHMAC === receivedHmac;
};
