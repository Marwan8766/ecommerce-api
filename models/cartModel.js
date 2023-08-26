const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: [true, 'A Cart must have a user id'],
    },

    totalPrice: {
      type: Number,
      min: 0,
      required: [true, 'A Cart must have a totalPrice'],
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
    //
  },
  {
    timestamps: true, // Add timestamps option
  }
);

// pre save middleware to calculate the total price
cartSchema.pre('save', function (next) {
  const cart = this;

  // set the total price back to zero
  cart.totalPrice = 0;

  // loop over the items array
  cart.items.forEach((item) => {
    // add each item price to the totalPrice and consider the product discount
    cart.totalPrice +=
      (item.price - item.price * (item.discount / 100)) * item.quantity;
  });

  // call next
  next();
});

// pre find middleware to check item availability and recalc the total price

// Pre-save middleware to check the availability of items
// cartSchema.pre('save', async function (next) {
//   try {
//     const cart = this;

//     // Create an array to store promises for availability checks
//     const availabilityPromises = cart.items.map(async (item) => {
//       // Find the product using the product id in the item
//       const product = await mongoose.model('Product').findById(item.product);

//       // Check for the variation quantity and if less than 1, throw an error
//       const selectedVariation = product.variations.id(
//         item.selectedVariation.variationId
//       );
//       if (!selectedVariation || selectedVariation.quantity < 1) {
//         throw new AppError(
//           `Selected variation is not available, itemId: ${item._id} , variationId: ${item.selectedVariation.variationId}`,
//           400
//         );
//       }
//     });

//     // Run all availability checks in parallel
//     await Promise.all(availabilityPromises);

//     // All variations are available, call next
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
