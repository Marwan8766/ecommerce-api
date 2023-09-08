const Agenda = require('agenda');
const blackListTokenModel = require('../models/blackListToken.model');
const Order = require('../models/orderModel');
const Coupon = require('../models/couponModel');
const Product = require('../models/productModel');
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
    order.status = 'canceled';
    promises.push(order.save({ validateModifiedOnly: true }));

    // cancel the coupon
    promises.push(findAndCancelCoupon(order.couponId));

    // cancel the items
    promises.push(findAndCancelProducts(order.items));

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

const findAndCancelCoupon = async (couponId) => {
  if (!couponId) return;

  await Coupon.findOneAndUpdate(
    {
      _id: couponId,
      expirationDate: { $gt: Date.now() },
    },
    { $inc: { quantity: 1 } }, // Increment the quantity by one
    { new: true } // Return the updated document
  );
};

const findAndCancelProducts = async (orderItems) => {
  // Create an array to store promises for finding and canceling products
  const findAndCancelPromises = orderItems.map(async (orderItem) => {
    const product = await Product.findById(orderItem.product);

    if (!product) {
      // Product not found, you can log this if needed
      console.log(`Product not found for item with ID: ${orderItem._id}`);
      return; // Skip canceling this item
    }

    const selectedVariation = product.variations.find(
      (variation) =>
        variation._id.toString() ===
        orderItem.selectedVariation.variationId.toString()
    );

    if (!selectedVariation) {
      // Selected variation not found, you can log this if needed
      console.log(
        `Selected variation not found for item with ID: ${orderItem._id}`
      );
      return; // Skip canceling this item
    }

    // Cancel the product by incrementing the quantity back
    selectedVariation.quantity += orderItem.quantity;

    // Save the updated product
    await product.save({ validateModifiedOnly: true });
  });

  // Run all find and cancel promises in parallel
  await Promise.all(findAndCancelPromises);
};

module.exports = agenda;
