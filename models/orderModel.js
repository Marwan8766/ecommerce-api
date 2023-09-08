const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'An Order must have a user id'],
      index: true,
      ref: 'User',
    },
    status: {
      type: String,
      index: true,
      required: [true, 'An Order must have a status'],
      enum: [
        'preCheckout',
        'pending',
        'outForDeleviery',
        'canceled',
        'completed',
      ],
      default: 'preCheckout',
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    coupon: {
      name: {
        type: String,
        min: 4,
      },

      discount: {
        type: Number,
        min: 1,
        max: 100,
      },

      discountMoneyLimit: {
        type: Number,
      },
    },
    delevieryZoneId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'An Order must have a deleviery zone id'],
      ref: 'DelevieryZone',
    },
    zoneEn: {
      type: String,
      required: [true, 'An Order must have a zone English name'],
    },
    zoneAr: {
      type: String,
      required: [true, 'An Order must have a zone Arabic name'],
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'An Order must have a user address id'],
    },
    address: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      name: {
        type: String,
        default: 'Home',
      },
      city: {
        type: String,
        required: [true, 'An Address must have a City name'],
      },
      street: {
        type: String,
        required: [true, 'An Address must have a Street name'],
      },
      buildingNumber: {
        type: Number,
        required: [true, 'An Address must have a Building Number'],
      },
      floorNumber: {
        type: Number,
        required: [true, 'An Address must have a Floor Number'],
      },
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
      min: 0,
    },
    delevieryTimeInDays: {
      type: Number,
      min: 0,
      required: [true, 'An Order must have a Deleviery Time in Days'],
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'online'],
      required: [true, 'An Order must have a payment method'],
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: [true, 'A Cart Item must have a Product Id'],
        },
        selectedVariation: {
          color: String,
          size: String,
          variationId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'A Cart Item must have a Product Variation'],
          },
        },
        quantity: {
          type: Number,
          min: 1,
          required: [
            true,
            'A Cart Item must have a Product Variation Quantity',
          ],
        },
        price: {
          type: Number,
          min: 0,
          required: [true, 'A Cart Item must have a Price'],
        },
        discount: {
          type: Number,
          min: 0,
          default: 0,
          required: [true, 'A Cart Item must have a discount'],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

orderSchema.pre('save', function (next) {
  // Check if a coupon is associated with the order
  if (this.coupon.name) {
    // Calculate the discount amount based on the coupon's percentage discount
    const discountAmount = (this.coupon.discount / 100) * this.totalItemsPrice;

    // Apply the discount up to the discount money limit, if applicable
    if (
      this.coupon.discountMoneyLimit &&
      discountAmount > this.coupon.discountMoneyLimit
    ) {
      this.totalPrice = this.totalItemsPrice - this.coupon.discountMoneyLimit;
    } else {
      this.totalPrice = this.totalItemsPrice - discountAmount;
    }
  } else {
    // If no coupon is associated, use the original totalItemsPrice
    this.totalPrice = this.totalItemsPrice;
  }

  // Add the delivery fee to the total price
  this.totalPrice += this.delevieryPrice;

  next();
});

const orderModel = mongoose.model('Order', orderSchema);
module.exports = orderModel;
