const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      min: 4,
      index: true,
      required: [true, 'A Coupon must have a unique name'],
    },

    quantity: {
      type: Number,
      min: 0,
      required: [true, 'A Coupon must have a quantity'],
    },

    discount: {
      type: Number,
      min: 1,
      required: [true, 'A Coupon must have a discount and be >= 1%'],
    },

    discountMoneyLimit: {
      type: Number,
      min: 1,
    },

    expirationDate: {
      type: Date,
      validate: {
        validator: function (value) {
          // Validate that the expiration date is greater than the current date
          return new Date(value) > Date.now();
        },
        message: 'Expiration date must be in the future',
      },
      required: [true, 'A Coupon must have an expiration date'],
    },
    //
  },
  {
    timestamps: true, // Add timestamps option
  }
);

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
