const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const Favourite = require('../models/favouriteModel');
const Product = require('../models/productModel');

exports.addToFavourite = catchAsync(async (req, res, next) => {
  const productId = req.params.id;
  const userId = req.user._id;

  // find the product
  const product = await Product.findById(productId);
  if (!product) return next(new AppError("This product doesn't exist", 404));

  // try to find this user favorite doc
  let favorite = await Favourite.findOne({ user: userId });

  // if found add to it this product
  if (favorite && !favorite.products.includes(productId)) {
    favorite.products.push(productId);
    await favorite.save({ validateModifiedOnly: true });
  }
  // else create one with this product
  else
    favorite = await Favourite.create({ user: userId, products: [productId] });

  res.status(200).json({
    status: 'success',
    data: {
      data: favorite,
    },
  });
});

exports.removeFromFavourite = catchAsync(async (req, res, next) => {
  const productId = req.params.id;
  const userId = req.user._id;

  // try to find this user favourites if not found return error
  const favourite = await Favourite.findOne({ user: userId });
  if (!favourite)
    return next(new AppError('Your Favourite is already empty', 400));

  // else remove this product from the fav
  //  ...

  // Check if the product exists in the user's favorites
  const productIndex = favourite.products.indexOf(productId);
  if (productIndex === -1)
    return next(new AppError('Product not found in favorites', 404));

  // Remove the product from the user's favorites
  favourite.products.splice(productIndex, 1);
  await favourite.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: 'success',
    message: 'Product removed from favorites',
    data: {
      data: favourite,
    },
  });
});
