const DelevieryZone = require('../models/delevieryZoneModel');
const Coupon = require('../models/couponModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');

const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const agenda = require('../utils/agenda');

exports.preCheckout = catchAsync(async (req, res, next) => {
  const {
    paymentMethod,
    paymentMethodType,
    addressId,
    delevieryZoneId,
    couponName,
  } = req.body;
  const { user } = req;

  const promises = [];

  // get the users cart and check that it isnot empty
  const cart = await Cart.findOne({ user: user._id });
  if (!cart || cart.items.length === 0)
    return next(new AppError('Your cart is empty', 404));

  // find the address
  const address = findAddress(user.address, addressId);

  // find the deleviery zone
  const zonePromise = findDelevieryZone(delevieryZoneId);
  promises.push(zonePromise);

  // check if there is coupon apply it and reserve it
  const couponPromise = findAndReserveCoupon(couponName);
  promises.push(couponPromise);

  // reserve the products which are all items in the user's cart
  const productsPromise = findAndReserveProducts(cart.items);
  promises.push(productsPromise);

  // run all the promises
  const [zoneResult, couponResult] = await Promise.all(promises);

  // check if paymentMethod is online then there must be paymentMethodType
  const paymentMethodTypeObj = {
    card: true,
    kiosk: true,
    wallet: true,
    valu: true,
  };
  if (paymentMethod === 'online' && !paymentMethodTypeObj[paymentMethodType])
    return next(
      new AppError(
        'you must provide a valid paymentMethodType if you choose to pay online',
        400
      )
    );

  // create the order
  const newOrderObj = {
    user: user._id,
    delevieryZoneId: zoneResult._id,
    zoneEn: zoneResult.zoneName_en,
    zoneAr: zoneResult.zoneName_ar,
    addressId: address._id,
    address,
    totalItemsPrice: cart.totalPrice,
    delevieryPrice: zoneResult.delevieryFee,
    delevieryTimeInDays: zoneResult.delevieryTimeInDays,
    paymentMethod,
    paymentMethodType,
    items: cart.items,
  };

  if (couponResult) {
    newOrderObj.couponId = couponResult._id;
    newOrderObj.coupon = couponResult;
  }

  const newOrder = await Order.create(newOrderObj);

  if (!newOrder) return next(new AppError("Couldn't make your order", 400));

  // schedule the agenda job to cancel the order after 1 hour if not confirmed
  await agenda.schedule(
    new Date(Date.now() + 60 * 60 * 1000),
    'cancel preCheckout order',
    { orderId: newOrder._id }
  );

  // send a response with the data
  res.status(200).json({
    status: 'success',
    message:
      'Your order has been successfully created please review it and confirm your order to complete the checkout, if there is something wrong please cancel it and reorder.',
    data: {
      data: newOrder,
    },
  });
});

exports.checkoutCash = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { user } = req;

  // find the user order
  const order = await Order.findById(orderId);
  if (!order)
    return next(
      new AppError("This Order Couldn't be found, Please ReOrder", 404)
    );

  // check that this is the real user
  if (order.user.toString() !== user._id.toString())
    return next(new AppError("This isn't your order)", 403));

  // check if the payment isnot cash then call next
  if (order.paymentMethod !== 'cash') {
    req.order = order;
    return next();
  }

  // update the status to pending
  order.status = 'pending';

  // find the user cart
  const cart = await Cart.findOne({ user: user._id });

  // empty the cart items
  cart.items = [];

  // initialize array of prmoises
  const promises = [];

  // update the cart and the order
  promises.push(order.save({ validateModifiedOnly: true }));
  promises.push(cart.save({ validateModifiedOnly: true }));

  // run all promises
  const [orderResult] = await Promise.all(promises);

  // send a response with the data
  return res.status(200).json({
    status: 'success',
    message:
      'your order was successfully received and will be deleviered to you within the deleviery time specified in your order.',
    data: {
      data: orderResult,
    },
  });
});

exports.checkoutOnline = catchAsync(async (req, res, next) => {
  const order = req.order;
});

/////////////////////////////////////////////
/////////////////////////////////////////////

const findAddress = (addressArr, addressId) => {
  try {
    const address = addressArr.filter(
      (userAddress) => userAddress._id.toString() === addressId.toString()
    );

    if (!address) throw new AppError('Address not found', 404);

    return address[0];
  } catch {
    throw new AppError('Address not found', 404);
  }
};

const findDelevieryZone = async (zoneId) => {
  try {
    const delevieryZone = await DelevieryZone.findById(zoneId);

    if (!delevieryZone)
      throw new AppError("This deleviery zone cann't be found", 404);

    return delevieryZone;
  } catch {
    throw new AppError("This deleviery zone cann't be found", 404);
  }
};

const findAndReserveCoupon = async (couponName) => {
  if (!couponName) return null;

  const coupon = await Coupon.findOneAndUpdate(
    {
      name: couponName,
      expirationDate: { $gt: Date.now() },
      quantity: { $gt: 0 },
    },
    { $inc: { quantity: -1 } }, // Decrement the quantity by one
    { new: true } // Return the updated document
  );

  return coupon;
};

const findAndReserveProducts = async (cartItems) => {
  try {
    // Create an array to store promises for finding and reserving products
    const findAndReservePromises = cartItems.map(async (cartItem) => {
      const product = await Product.findById(cartItem.product);

      // Check if the product is found
      if (!product) {
        throw new AppError(
          `Product not found for item with ID: ${cartItem._id}`,
          404
        );
      }

      // Find the selected variation
      const selectedVariation = product.variations.find(
        (variation) =>
          variation._id.toString() ===
          cartItem.selectedVariation.variationId.toString()
      );

      // Check if the selected variation is found
      if (!selectedVariation) {
        throw new AppError(
          `Selected variation not found for item with ID: ${cartItem._id}`,
          404
        );
      }

      // Check if the selected variation quantity is available
      if (selectedVariation.quantity < cartItem.quantity) {
        throw new AppError(
          `Selected variation quantity not available for item with ID: ${cartItem._id}`,
          404
        );
      }

      // Reserve the product by decrementing the quantity
      selectedVariation.quantity -= cartItem.quantity;

      // Save the updated product
      await product.save({ validateModifiedOnly: true });
    });

    // Run all find and reserve promises in parallel
    await Promise.all(findAndReservePromises);
  } catch (error) {
    console.error(error);
    throw new AppError('Error finding the products', 404);
  }
};
