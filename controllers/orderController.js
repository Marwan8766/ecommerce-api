const Order = require('../models/orderModel');
const Factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// get all orders (admin only)  (includes filter by status and date and totalprice and paymentMethod and paymentMethodType and userId)
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
    queryObj.createdAt = { $gte: new Date(minDate), $lte: new Date(maxDate) };
  }

  // sort by price, date, userId, status
  let sortType = sort === 'desc' ? -1 : 1;

  let sortObj = {};

  if (sortBy) {
    const sortByArr = sortBy.split(',');
    sortByArr.forEach((sortField) => {
      if (sortField === 'totalPrice') sortObj.totalPrice = sortType;
      if (sortField === 'createdAt') sortObj.createdAt = sortType;
      if (sortField === 'userId') sortObj.user = sortType;
      if (sortField === 'status') sortObj.status = sortType;
    });
  }

  // Parse page and limit values from the request query
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 5;
  const skip = (parsedPage - 1) * parsedLimit;

  // find the orders
  const orders = await Order.find(queryObj)
    .sort(sortObj)
    .skip(skip)
    .limit(parsedLimit);

  // return error if not found
  if (orders.length === 0)
    return next(new AppError('no orders were found', 404));

  // send back a response
  res.status(200).json({
    status: 'success',
    data: {
      currentPage: parsedPage,
      totalItems: orders.length,
      totalPages: Math.ceil(orders.length / parsedLimit),
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
exports.cancelOrder = catchAsync(async (req, res, next) => {});
