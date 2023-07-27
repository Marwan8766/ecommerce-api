const mongoose = require('mongoose');

const Product = require('../models/productModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { promisify } = require('util');
const User = require('../models/userModel');
const Token = require('../models/token.model');
const blacklistToken = require('../models/blackListToken.model');
const jwt = require('jsonwebtoken');
const handlerFactory = require('./handlerFactory');
const Favourite = require('../models/favouriteModel');

const cloudinary = require('cloudinary').v2;

exports.configureCloudinary = catchAsync(async (req, res, next) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  next();
});

exports.checkCreateProductMiddleware = catchAsync(async (req, res, next) => {
  const {
    name,
    name_ar,
    description,
    description_ar,
    category,
    variations,
    price,
  } = req.body;
  console.log(req);
  const coverImage = req.files['image'];

  if (!name)
    return next(
      new AppError('Please provide the Product name in English', 400)
    );

  if (!name_ar)
    return next(new AppError('Please provide the Product name in Arabic', 400));

  if (!description)
    return next(
      new AppError('Please provide the Product description in English', 400)
    );

  if (!description_ar)
    return next(
      new AppError('Please provide the Product description in Arabic', 400)
    );

  if (!category)
    return next(new AppError('Please provide the Product category', 400));

  if (!coverImage)
    return next(new AppError('Please provide the Product cover image', 400));

  if (variations) {
    try {
      req.body.variations = JSON.parse(variations);
    } catch {
      return next(new AppError('Invalid variations data', 400));
    }
  }

  if (!price)
    return next(new AppError('Please provide the Product price', 400));

  next();
});

exports.uploadCreateProductImages = catchAsync(async (req, res, next) => {
  const coverImage = req.files['image'][0];
  const images = req.files['images'];

  try {
    const result = await cloudinary.uploader.upload(coverImage.path, {
      folder: '',
    });

    req.coverImageUrl = result.secure_url;
  } catch (err) {
    return next(new AppError('Error uploading the cover image', 400));
    console.error(err);
  }

  if (images && images.length > 0) {
    try {
      const imagePromises = images.map((image) =>
        cloudinary.uploader.upload(image.path, {
          folder: '',
        })
      );

      const imagesResults = await Promise.all(imagePromises);

      // Store the array of image URLs in the request object
      req.imageUrls = imagesResults.map((result) => result.secure_url);
    } catch (err) {
      return next(new AppError('Error uploading the product images', 400));
      console.error(err);
    }
  }

  next();
});

exports.createProduct = catchAsync(async (req, res, next) => {
  const {
    name,
    name_ar,
    description,
    description_ar,
    category,
    discount,
    variations,
    active,
    price,
  } = req.body;

  const { coverImageUrl, imageUrls } = req;

  // Create the category in the database with the Cloudinary image URL
  const newProduct = await Product.create({
    name,
    name_ar,
    description,
    description_ar,
    category,
    discount,
    price,
    variations,
    coverImage: coverImageUrl,
    images: imageUrls,
    active: active === false ? false : true,
  });

  if (!newProduct) return next(new AppError('Error creating the Product', 400));

  res.status(201).json({
    status: 'success',
    data: {
      data: newProduct,
    },
  });
});

exports.uploadUpdateProductCoverImage = catchAsync(async (req, res, next) => {
  const coverImage = req.files['image'] ? req.files['image'][0] : undefined;
  const images = req.files['images'];

  if (!req.body.currentImages)
    return next(new AppError('Please provide the current images', 400));

  const productId = req.params.id;

  const product = await Product.findById(productId);
  if (!product) return next(new AppError("Can't find this product", 404));

  req.product = product;

  if (!coverImage) return next();

  const result = await cloudinary.uploader.upload(coverImage.path, {
    folder: '',
  });

  const imageUrlToBeDeleted = product.coverImage;

  await deleteImageCloudinary(imageUrlToBeDeleted);

  req.coverImageUrl = result.secure_url;
  next();
});

exports.uploadUpdateProductImages = catchAsync(async (req, res, next) => {
  const images = req.files['images'];

  if (!images) return next();

  try {
    const uploadPromises = images.map((image) =>
      cloudinary.uploader.upload(image.path, {
        folder: '',
      })
    );

    const imagesResults = await Promise.all(uploadPromises);

    // Store the array of image URLs in the request object
    req.imagesUrl = imagesResults.map((result) => result.secure_url);

    next();
  } catch (err) {
    console.error(err);
    return next(new AppError('Error uploading images', 400));
  }
});

exports.deleteProductImagesPreUpdate = catchAsync(async (req, res, next) => {
  const { currentImages } = req.body;
  const { product } = req;

  const deletePromises = [];
  const imagesToDelete = [];

  for (const image of product.images) {
    if (!currentImages.includes(image)) {
      deletePromises.push(deleteImageCloudinary(image));
      imagesToDelete.push(image);
    }
  }

  // Remove images to be deleted from product.images array
  product.images = product.images.filter(
    (image) => !imagesToDelete.includes(image)
  );

  await Promise.all(deletePromises);

  req.product = product;
  next();
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  const {
    name,
    name_ar,
    description,
    description_ar,
    category,
    discount,
    price,
    variations,
    active,
  } = req.body;

  const { coverImageUrl, imagesUrl, product } = req;

  if (name) product.name = name;
  if (name_ar) product.name_ar = name_ar;
  if (description) product.description = description;
  if (description_ar) product.description_ar = description_ar;
  if (category) product.category = category;
  if (discount) product.discount = discount;
  if (price) product.price = price;
  if (variations) product.variations = variations;
  if (coverImageUrl) product.coverImage = coverImageUrl;
  if (imagesUrl && imagesUrl.length > 0)
    product.images = [...product.images, ...imagesUrl];
  product.active = active === false ? false : true;

  const updatedProduct = await product.save({ validateModifiedOnly: true });

  if (!updatedProduct)
    return next(new AppError('Error updating this product', 400));

  res.status(200).json({
    status: 'success',
    data: {
      data: updatedProduct,
    },
  });
});

exports.preDeleteProductCoverImageMiddleware = catchAsync(
  async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    if (!product)
      return next(new AppError("This product couldn't be found", 404));

    req.product = product;

    const imageUrl = product.coverImage;

    await deleteImageCloudinary(imageUrl);

    next();
  }
);

exports.preDeleteProductImagesMiddleware = catchAsync(
  async (req, res, next) => {
    const { product } = req;

    if (!product.images || product.images.length < 1) return next();

    const deletePromises = product.images.map((imageUrl) =>
      deleteImageCloudinary(imageUrl)
    );

    await Promise.all(deletePromises);

    next();
  }
);

exports.getAllProduct = catchAsync(async (req, res, next) => {
  // Extract filtering, sorting, and search parameters from the request query
  const {
    minPrice,
    maxPrice,
    discount,
    search,
    sort,
    categoryId,
    page,
    limit,
  } = req.query;

  if (!categoryId)
    return next(new AppError('Please provide the category id', 400));

  // Build the filter object based on the parameters
  const filter = {
    category: mongoose.Types.ObjectId(categoryId),
  };
  let projection = {};
  if (!req.user || req.user.role !== 'admin') {
    filter.active = true;
    projection = {
      ratingsAverage: 0,
      ratingsQuantity: 0,
    };
  }
  if (discount === 'true') {
    filter.discount = { $gt: 0 };
  } else if (discount === 'false') {
    filter.discount = 0;
  }

  if (minPrice && maxPrice) filter.price = { $gte: minPrice, $lte: maxPrice };
  else if (minPrice) filter.price = { $gte: minPrice };
  else if (maxPrice) filter.price = { $lte: maxPrice };

  // If there is a search query, use a regular expression to match against both English and Arabic names
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [{ name: searchRegex }, { name_ar: searchRegex }];
  }

  let sortType = sort === 'desc' ? -1 : 1;

  // Parse page and limit values from the request query
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 5;
  const skip = (parsedPage - 1) * parsedLimit;

  const products = await Product.find(filter, projection)
    .sort({ price: sortType })
    .skip(skip)
    .limit(parsedLimit);

  if (products.length === 0) {
    return next(new AppError('No products were found', 404));
  }

  if (req.user) {
    const favourite = await Favourite.findOne({ user: req.user._id });
    const favouriteIds = favourite
      ? favourite.products.map((id) => id.toString())
      : [];
    ``;
    products.forEach((product) => {
      const productIdString = product._id.toString();
      product.favourite = favouriteIds.includes(productIdString);
    });
  }
  //
  res.status(200).json({
    status: 'success',
    data: {
      currentPage: parsedPage,
      totalItems: products.length,
      totalPages: Math.ceil(products.length / parsedLimit),
      data: products,
    },
  });
});

// exports.getAllProductAdmin = catchAsync(async (req, res, next) => {
//   const products = await Product.find()
//     .select('ratingsAverage ratingsQuantity')
//     .exec();

//   if (products.length === 0)
//     return next(new AppError('No products were found', 404));

//   res.status(200).json({
//     status: 'success',
//     data: {
//       data: products,
//     },
//   });
// });
// exports.getAllProductAdmin = catchAsync(async (req, res, next) => {
//   // Extract filtering, sorting, and search parameters from the request query
//   const { minPrice, maxPrice, discount, search, sort } = req.query;

//   // Build the filter object based on the parameters
//   const filter = {
//     'variations.price': {
//       $gte: minPrice || 0,
//       $lte: maxPrice || Number.MAX_SAFE_INTEGER,
//     },
//   };

//   if (discount === 'true') {
//     filter.discount = { $gt: 0 };
//   } else if (discount === 'false') {
//     filter.discount = 0;
//   }

//   // If there is a search query, use a regular expression to match against both English and Arabic names
//   if (search) {
//     const searchRegex = new RegExp(search, 'i');
//     filter.$or = [{ name: searchRegex }, { name_ar: searchRegex }];
//   }

//   // Perform the aggregation to filter and sort the products
//   const sortField = sort === 'desc' ? -1 : 1; // -1 for descending, 1 for ascending
//   const products = await Product.aggregate([
//     { $match: filter },
//     {
//       $addFields: {
//         lowestPrice: { $min: '$variations.price' }, // Find the lowest price among variations
//       },
//     },
//     {
//       $sort: { lowestPrice: sortField }, // Sort by the lowest price based on the user's choice
//     },
//     {
//       $project: {
//         name: 1,
//         name_ar: 1,
//         description: 1,
//         description_ar: 1,
//         images: 1,
//         coverImage: 1,
//         discount: 1,
//         active: 1,
//         category: 1,
//         variations: 1,
//         ratingsAverage: 1,
//         ratingsQuantity: 1,
//       },
//     },
//   ]);

//   if (products.length === 0) {
//     return next(new AppError('No products were found', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       data: products,
//     },
//   });
// }); //

exports.deleteProduct = handlerFactory.deleteOne(Product);

exports.getProduct = catchAsync(async (req, res, next) => {
  const productId = req.params.id;

  const product = await Product.findById(productId);
  if (!product) return next(new AppError("Can't find this product", 404));

  if (req.user) {
    const favourite = await Favourite.findOne({ user: req.user._id });
    const favouriteIds = favourite
      ? favourite.products.map((id) => id.toString())
      : [];
    ``;
    const productIdString = product._id.toString();
    product.favourite = favouriteIds.includes(productIdString);
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: product,
    },
  });
});

exports.authUserProduct = catchAsync(async (req, res, next) => {
  // get token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  )
    token = req.headers.authorization.split(' ')[1];
  // else if (req.cookies.jwt) token = req.cookies.jwt;

  if (!token) return next();

  // verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // check if the user still exists
  const currentUser = await User.findById(decoded.id).select('+emailConfirmed');
  if (!currentUser)
    return next(new AppError('This user does no longer exist'), 401);

  console.log(`user emailConfirmed: ${currentUser.emailConfirmed}`);
  console.log(`user role: ${currentUser.role}`);
  // check if user confirmed his email
  if (!currentUser.emailConfirmed)
    return next(new AppError('You must confirm your email first', 403));

  // check if the user has chamged his password after the token was issued
  if (
    currentUser.passwordHasChanged(decoded.iat, currentUser.passwordChangedAt)
  )
    return next(
      new AppError('Your password has changed, please login again', 401)
    );

  // check if the token is in the black list tokens
  const tokenBlackListed = await blacklistToken.findOne({ token });
  if (tokenBlackListed)
    return next(
      new AppError('Your session has expired, please login again', 401)
    );

  req.user = currentUser;
  // Grant access to the protected route
  next();
});

const deleteImageCloudinary = async (imageUrl) => {
  try {
    // Extract the public ID of the image from its URL
    const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];

    // Delete the image from Cloudinary
    cloudinary.uploader
      .destroy(publicId, { resource_type: 'image' })
      .catch((err) => {
        console.error('Error deleting image:', err);
        throw new AppError("This Category image couldn't be deleted", 400);
      });
  } catch (err) {
    console.error(err);
  }
};
