const Factory = require('./handlerFactory');
const Coupon = require('../models/couponModel');

exports.createCoupon = Factory.createOne(Coupon);
exports.getAllCoupon = Factory.getAll(Coupon);
exports.updateCoupon = Factory.updateOne(Coupon);
exports.deleteCoupon = Factory.deleteOne(Coupon);
