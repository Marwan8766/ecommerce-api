const mongoose = require('mongoose');
const Product = require('./productModel');

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

// pre find middleware to check item availability and re calc the total price
cartSchema.post(/^find/, async function (cart) {
  if (!cart || cart.items.length === 0) return;
  // group all the product ids for this cart items in an array
  const productIds = cart.items.map((item) => item.product);

  // find all those products and put them in an object
  const products = await Product.find({ _id: { $in: productIds } });

  const productsObj = {};
  products.forEach((product) => {
    productsObj[product._id] = product;
  });

  // construct the new items array
  const newItems = [];

  // initialize a variable to know whether to save the cart or not
  let cartHasChanged = false;

  // loop over the cart items and for each one :
  for (const item of cart.items) {
    // find the product of it if not found remove cart item
    const currentProduct = productsObj[item.product];
    if (!currentProduct) {
      cartHasChanged = true;
      continue;
    }
    // find that variation if not found remove cart item
    const variationIndex = currentProduct.variations.findIndex(
      (variation) =>
        variation._id.toString() ===
        item.selectedVariation.variationId.toString()
    );

    if (variationIndex < 0) {
      cartHasChanged = true;
      continue;
    }

    const currentVariation = currentProduct.variations[variationIndex];

    // check if the quantity is available if isnot available check if the product quanity is greater than or equal 1 if so change the quantity with the product quantity else remove the item
    if (currentVariation.quantity >= item.quantity) {
      // add it to the newItems array as it was found
      if (
        item.price !== currentProduct.price ||
        item.discount !== currentProduct.discount
      ) {
        item.price = currentProduct.price;
        item.discount = currentProduct.discount;
        cartHasChanged = true;
      }
      newItems.push(item);
    } else if (currentVariation.quantity >= 1) {
      item.price = currentProduct.price;
      item.discount = currentProduct.discount;
      item.quantity = currentVariation.quantity;
      cartHasChanged = true;
      newItems.push(item);
    } else {
      cartHasChanged = true;
      continue;
    }
  }
  // if quantity changed or the price or discount of them is different or item is removed save the cart in order to recal the total price
  if (cartHasChanged) {
    cart.items = newItems;
    await cart.save({ validateModifiedOnly: true });
  }
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;

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
