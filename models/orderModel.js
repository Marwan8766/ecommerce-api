const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'An Order must have a user id'],
      ref: 'User',
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    delevieryZone: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'An Order must have a deleviery zone id'],
      ref: 'DelevieryZone',
    },
    zone: {
      type: String,
    },
    address: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'An Order must have a user address id'],
    },
    totalItemsPrice: {
      type: Number,
      required: [true, 'An Order must have a total items price'],
      min: 0,
    },
    delevieryPrice: {
      type: Number,
      required: [true, 'An Order must have a deleviery price'],
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: [true, 'An Order must have a total price'],
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'online'],
      required: [true, 'An Order must have a payment method'],
    },
  },
  {
    timestamps: true,
  }
);

const orderModel = mongoose.model('orderModel', orderSchema);
module.exports = orderModel;
