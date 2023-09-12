const Cart = require('../models/cartModel');
const Product = require('../models/productModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
// check that the quantity added plus the quantity already exists is available

// middleware to check product and item availability
exports.checkProductItemAvailability = catchAsync(async (req, res, next) => {
  // get the item from req body
  const { item } = req.body;

  // check if the item is available if not return error
  const product = await Product.findById(item.product);
  if (!product)
    return next(new AppError("This Product Couldn't be found", 404));

  // check if the variation is available with the selected quantity
  let notExist = true;
  let selectedVariationObj;

  // loop over the product variations and check if the variations exists
  product.variations.forEach((variation) => {
    if (
      variation.color === item.selectedVariation.color &&
      variation.size === item.selectedVariation.size
    ) {
      notExist = false;
      selectedVariationObj = variation;
      return;
    }
  });

  // if variation doesn't exist return error
  if (notExist)
    return next(new AppError("This Product Variation Couldn't be found", 404));

  // find the cart
  const cart = await Cart.findOne({ user: req.user._id });

  // find the index of item
  const cartItemIndex = cart
    ? cart.items.findIndex(
        (cartItem) =>
          cartItem.selectedVariation.variationId.toString() ===
          selectedVariationObj._id.toString()
      )
    : -1;

  // find the cart item quantity
  const cartItemQuantity =
    cartItemIndex >= 0 ? cart.items[cartItemIndex].quantity : 0;

  // check if the item quantity is available after adding this item quantity from the cart if already added
  if (selectedVariationObj.quantity - (item.quantity + cartItemQuantity) < 0)
    return next(
      new AppError(
        `This product variation quantity isn't available, Only ${
          selectedVariationObj.quantity - cartItemQuantity
        } is available`,
        400
      )
    );

  // if everything is ok call next
  const newItemObj = {
    ...item,
    price: product.price,
    discount: product.discount,
    selectedVariation: {
      variationId: selectedVariationObj._id,
      color: selectedVariationObj.color,
      size: selectedVariationObj.size,
    },
  };

  req.body.item = newItemObj;
  req.cartItemIndex = cartItemIndex;
  req.cart = cart;
  next();
});

// add to cart
exports.addToCart = catchAsync(async (req, res, next) => {
  // get the user from the req
  const { user, cartItemIndex } = req;

  // get the item from req body
  const { item } = req.body;

  // find the cart of that user
  const existingCart = req.cart;

  // initialize variable to  hold the cart after create or update
  let cart;

  // if not found create a new cart with the item
  if (!existingCart) {
    cart = await Cart.create({
      user: user._id,
      totalPrice: 0,
      items: [item],
    });

    res.status(200).json({
      status: 'success',
      message: 'Item was added successfully',
      data: {
        data: cart,
      },
    });
    return;
  }

  // if it was found add the item to it but check if it is already there just inc the quantity

  if (cartItemIndex >= 0)
    existingCart.items[cartItemIndex].quantity += item.quantity;
  else existingCart.items.push(item);

  cart = await existingCart.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: 'success',
    message: 'Item was added successfully',
    data: {
      data: cart,
    },
  });
});

// Remove from cart
exports.removeFromCart = catchAsync(async (req, res, next) => {
  // Get the user from the request
  const { user } = req;

  // Get the item ID from the request parameters
  const { itemId } = req.params;

  // Get the delete query if it is true it means the item must be deleted with all its quantities
  const { deleteItem } = req.query;

  // Find the cart of that user
  const cart = await Cart.findOne({ user: user._id });
  if (!cart) return next(new AppError("This Cart Couldn't be found", 404));

  // Find the index of the item to be removed in the items array
  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId.toString()
  );

  // If itemIndex is -1, the item was not found
  if (itemIndex === -1)
    return next(new AppError('Item not found in the cart', 404));

  // if item has quantity > 1 and delete isnot true then decrement it
  if (cart.items[itemIndex].quantity > 1 && deleteItem !== 'true') {
    cart.items[itemIndex].quantity--;
  } else {
    // else Remove the item from the items array using splice as its quantity was 1 or deleteItem is true
    cart.items.splice(itemIndex, 1);
  }

  // Save the updated cart
  const updatedCart = await cart.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: 'success',
    message: 'Item was removed successfully',
    data: {
      data: updatedCart,
    },
  });
});

// get cart
exports.getCart = catchAsync(async (req, res, next) => {
  // get the user from the req
  const { user } = req;

  // find the cart of that user
  const cart = await Cart.findOne({ user: user._id });
  if (!cart) return next(new AppError("This Cart Couldn't be found", 404));

  // send success response with the cart data
  res.status(200).json({
    status: 'success',
    data: {
      data: cart,
    },
  });
});
