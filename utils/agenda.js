const Agenda = require('agenda');
const blackListTokenModel = require('../models/blackListToken.model');
const Order = require('../models/orderModel');
const cancelHandler = require('../controllers/reserveCancelOrderHandler');
const dotenv = require('dotenv');

// Initialize the Agenda library
dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

const agenda = new Agenda({
  db: { address: DB },
});

// Define a task to remove the expired tokens
agenda.define('remove expired tokens', async (job, done) => {
  try {
    // Calculate the current timestamp
    const now = Date.now();

    // Remove all expired tokens from the blacklist collection
    const result = await blackListTokenModel.deleteMany({
      expiresAt: { $lt: now },
    });

    // If there is any error or the result is empty, throw an error
    if (result.deletedCount === 0) {
      throw new Error('No expired tokens found');
    }

    // If everything goes well, call the done function to indicate the task is finished
    done();
  } catch (error) {
    // If there is an error, call the done function with the error
    console.log(error);
    done(error);
  }
});

// Start the Agenda instance when it's ready
agenda.on('ready', () => {
  // Schedule the task to run every day at 4:00 AM
  agenda.every('0 4 * * *', 'remove expired tokens');
  agenda.start();
});

// Define a task to remove expired availabilities
agenda.define('cancel preCheckout order', async (job, done) => {
  try {
    // find the order using the order id
    const orderId = job.attrs.data.orderId;
    const order = await Order.findById(orderId);

    // if the order not found then it was deleted
    if (!order) return;

    // check if the order status isnot preCheckout then return
    if (order.status !== 'preCheckout') return;

    // define array to hold the promises
    const promises = [];

    // cancel the order
    order.status = 'canceledBeforePending';
    promises.push(order.save({ validateModifiedOnly: true }));

    // cancel the coupon
    promises.push(cancelHandler.findAndCancelCoupon(order.couponId));

    // cancel the items
    promises.push(cancelHandler.findAndCancelProducts(order.items));

    // run all promises in parallel
    await Promise.all(promises);

    // If everything goes well, call the done function to indicate the task is finished
    done();
  } catch (error) {
    // If there is an error, call the done function with the error
    console.log(error);
    done(error);
  }
});

// // Schedule the task to run every day at 12:00 AM
// agenda.every('0 0 * * *', 'remove expired availabilities');

// // Start the Agenda instance when it's ready
// agenda.on('ready', () => {
//   agenda.start();
// });

module.exports = agenda;
