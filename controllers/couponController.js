const Factory = require('./handlerFactory');
const Coupon = require('../models/couponModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createCoupon = Factory.createOne(Coupon);
exports.getAllCoupon = Factory.getAll(Coupon);
exports.updateCoupon = Factory.updateOne(Coupon);
exports.deleteCoupon = Factory.deleteOne(Coupon);

exports.verifyCoupon = catchAsync(async (req, res, next) => {
  // get the coupon name from the req query
  const couponName = req.query.name;

  // find the coupon and check if its date and quantity are available
  const coupon = await Coupon.findOne({
    name: couponName,
    expirationDate: { $gt: Date.now() },
    quantity: { $gt: 0 },
  });

  // if not send error
  if (!coupon) return next(new AppError('Invalid Coupon', 404));

  // send success res with the coupon data
  res.status(200).json({
    status: 'success',
    message: 'valid coupon',
    data: {
      data: coupon,
    },
  });
});
