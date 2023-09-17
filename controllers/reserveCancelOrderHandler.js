const Coupon = require('../models/couponModel');
const Product = require('../models/productModel');

exports.findAndReserveCoupon = async (couponName) => {
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

exports.findAndReserveProducts = async (cartItems) => {
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

exports.findAndCancelCoupon = async (couponId) => {
  if (!couponId) return;

  await Coupon.findOneAndUpdate(
    {
      _id: couponId,
      expirationDate: { $gt: Date.now() },
    },
    { $inc: { quantity: 1 } }, // Increment the quantity by one
    { new: true } // Return the updated document
  );
};

exports.findAndCancelProducts = async (orderItems) => {
  // Create an array to store promises for finding and canceling products
  const findAndCancelPromises = orderItems.map(async (orderItem) => {
    const product = await Product.findById(orderItem.product);

    if (!product) {
      // Product not found, you can log this if needed
      console.log(`Product not found for item with ID: ${orderItem._id}`);
      return; // Skip canceling this item
    }

    const selectedVariation = product.variations.find(
      (variation) =>
        variation._id.toString() ===
        orderItem.selectedVariation.variationId.toString()
    );

    if (!selectedVariation) {
      // Selected variation not found, you can log this if needed
      console.log(
        `Selected variation not found for item with ID: ${orderItem._id}`
      );
      return; // Skip canceling this item
    }

    // Cancel the product by incrementing the quantity back
    selectedVariation.quantity += orderItem.quantity;

    // Save the updated product
    await product.save({ validateModifiedOnly: true });
  });

  // Run all find and cancel promises in parallel
  await Promise.all(findAndCancelPromises);
};
