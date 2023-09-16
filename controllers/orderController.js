const Order = require('../models/orderModel');
const Factory = require('./handlerFactory');
const paymobController = require('./paymobController');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

// get all orders (protected)  (includes filter by status and date and totalprice and paymentMethod and paymentMethodType and userId)
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const {
    userId,
    status,
    paymentMethod,
    paymentMethodType,
    minPrice,
    maxPrice,
    minDate,
    maxDate,
    sort,
    sortBy,
    page,
    limit,
  } = req.query;
  // Get the current user
  const { user } = req;
  // Define the query obj
  const queryObj = {};

  // if current user isnot admin then find his orders only
  if (user.role !== 'admin') {
    queryObj.user = user._id;
  } else {
    // the user is the admin then check if he wants to filter by userId
    if (userId) queryObj.user = mongoose.Types.ObjectId(userId);
  }

  // filter by status
  if (status) queryObj.status = status;

  // filter by paymentMethod and paymentMethodType
  if (paymentMethod) queryObj.paymentMethod = paymentMethod;
  if (paymentMethodType) queryObj.paymentMethodType = paymentMethodType;

  // filter by price range
  if (minPrice && !maxPrice) {
    queryObj.totalPrice = { $gte: +minPrice };
  } else if (!minPrice && maxPrice) {
    queryObj.totalPrice = { $lte: +maxPrice };
  } else if (minPrice && maxPrice) {
    queryObj.totalPrice = { $gte: +minPrice, $lte: +maxPrice };
  }

  // filter by date
  if (minDate && !maxDate) {
    queryObj.createdAt = { $gte: new Date(minDate) };
  } else if (!minDate && maxDate) {
    queryObj.createdAt = { $lte: new Date(maxDate) };
  } else if (minDate && maxDate) {
    queryObj.createdAt = {
      $gte: new Date(minDate),
      $lte: new Date(maxDate),
    };
  }

  // sort by price, date, userId, status
  let sortType = sort === 'desc' ? -1 : 1;

  let sortObj = {
    createdAt: sortType,
  };

  if (sortBy) {
    const sortByArr = sortBy.split(',');
    sortByArr.forEach((sortField) => {
      if (sortField === 'totalPrice') sortObj.totalPrice = sortType;
      // if (sortField === 'createdAt') sortObj.createdAt = sortType;
      if (sortField === 'userId') sortObj.user = sortType;
      if (sortField === 'status') sortObj.status = sortType;
    });
  }

  // Define a promises array to hold the async promises
  const promises = [];

  // Parse page and limit values from the request query
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 5;
  const skip = (parsedPage - 1) * parsedLimit;

  const totalCountPromise = Order.countDocuments(queryObj);
  promises.push(totalCountPromise);

  // find the orders
  const ordersPromise = Order.find(queryObj)
    .sort(sortObj)
    .skip(skip)
    .limit(parsedLimit);
  promises.push(ordersPromise);

  const [totalCount, orders] = await Promise.all(promises);

  // return error if not found
  if (orders.length === 0)
    return next(new AppError('no orders were found', 404));

  // send back a response
  res.status(200).json({
    status: 'success',
    data: {
      currentPage: parsedPage,
      totalItems: totalCount,
      totalPages: Math.ceil(totalCount / parsedLimit),
      data: orders,
    },
  });
});

// get order (check if not admin then he must own this order)
exports.getOrder = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  // find the order
  const order = await Order.findById(id);

  // if not found return error
  if (!order) return next(new AppError('no order was found', 404));

  // check if the user isnot the admin then must be his order else return error
  if (user.role !== 'admin' && order.user.toString() !== user._id.toString())
    return next(new AppError("you aren't authorized to view this order", 403));

  // send success res
  res.status(200).json({
    status: 'success',
    data: {
      data: order,
    },
  });
});

// update order status (only admin)
exports.updateOrderFilterBody = (req, res, next) => {
  const bodyObj = { status: req.body.status };
  req.body = bodyObj;
  next();
};

exports.updateOrder = Factory.updateOne(Order);

// cancel order
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  // find the order
  const order = await Order.findById(id);
  if (!order) return next(new AppError('no order was found with that id', 404));

  // user must own the order or be an admin
  if (order.user.toString() !== user._id.toString() && user.role !== 'admin')
    return next(
      new AppError("you don't have the auhtority to cancel this order", 403)
    );

  // CHECK ORDER STATUS

  // if not pending or outForDeleviery return error
  if (order.status !== 'pending' || order.status !== 'outForDeleviery')
    return next(
      new AppError(`you can't cancel this order as it is ${order.status}`),
      400
    );

  // CASE PENDING
  if (order.status === 'pending') {
    // cash payment
    if (order.paymentMethod === 'cash') {
      req.cancelType = 'pendingCash';
      req.order = order;
      return next();
    }

    // online payment
    if (order.paymentMethod === 'online') {
      req.cancelType = 'pendingOnline';
      req.order = order;
      return next();
    }
  }

  // CASE DELEVIERY
  if (order.status === 'outForDeleviery') {
    // cash payment
    if (order.paymentMethod === 'cash') {
      req.cancelType = 'delevieryCash';
      req.order = order;
      return next();
    }

    // online payment
    if (order.paymentMethod === 'online') {
      req.cancelType = 'delevieryOnline';
      req.order = order;
      return next();
    }
  }

  // here it means that no case matched the order so return error
  console.error(
    `can't update this order: ${order._id} as it's case hasn't been matched: ${order}`
  );

  return next(
    new AppError("something went wrong can't cancel this order", 500)
  );
});

exports.cancelCashPending = catchAsync(async (req, res, next) => {
  const { cancelType, order } = req;

  if (cancelType !== 'pendingCash') return next();

  // cancel the order
  order.status = 'canceled';
  const updatedOrder = await order.save({ validateModifiedOnly: true });

  if (!updatedOrder)
    return next(
      new AppError('error canceling your order please try again', 500)
    );

  return res.status(200).json({
    status: 'success',
    message: 'your order has been successfully canceled',
  });
});

exports.cancelOnlinePending = catchAsync(async (req, res, next) => {
  const { cancelType, order, paymobAuthToken } = req;
  const transaction_id = order.paymobPayTransactionId;
  const amount = order.totalPrice;
  let amount_cents_refunded = 0;

  if (cancelType !== 'pendingOnline') return next();

  // cancel the order and return all user money
  try {
    amount_cents_refunded = await paymobController.refund(
      paymobAuthToken,
      transaction_id,
      amount
    );
  } catch (error) {
    console.error(`refund error: ${error}`);
    return next(new AppError('error while refunding', 500));
  }

  return res.status(200).json({
    status: 'success',
    message: 'the order has been successfully canceled and refunded.',
    amount_cents_refunded,
  });
});

exports.cancelCashDeleviery = catchAsync(async (req, res, next) => {
  const { cancelType, order, user } = req;

  if (cancelType !== 'delevieryOnline') return next();

  // cash payment and not admin so return error
  if (order.paymentMethod === 'cash' && user.role !== 'admin') {
    return next(
      new AppError(
        "the order has been already out for deleviery so sorry you can't cancel it anymore you have to wait untill the order is deleviered and pay the deleviery fee only and don't take the order",
        400
      )
    );
  }

  // cash and admin so cancel the order and return response
  if (order.paymentMethod === 'cash' && user.role === 'admin') {
    order.status = 'canceled';
    const updatedOrder = await order.save({ validateModifiedOnly: true });

    if (!updatedOrder)
      return next(
        new AppError('error canceling your order please try again', 500)
      );

    return res.status(200).json({
      status: 'success',
      message: 'your order has been successfully canceled',
    });
  }

  next();
});

exports.cancelOnlineDeleviery = catchAsync(async (req, res, next) => {
  const { cancelType, order, paymobAuthToken } = req;
  const transaction_id = order.paymobPayTransactionId;
  const amount = order.totalPrice;
  let amount_cents_refunded = 0;

  if (cancelType !== 'delevieryOnline')
    return next(new AppError('something went wrong', 400));

  // cancel the order and return all user money
  try {
    amount_cents_refunded = await paymobController.refund(
      paymobAuthToken,
      transaction_id,
      amount
    );
  } catch (error) {
    console.error(`refund error: ${error}`);
    return next(new AppError('error while refunding', 500));
  }

  return res.status(200).json({
    status: 'success',
    message: 'the order has been successfully canceled and refunded.',
    amount_cents_refunded,
  });
});
