const Product = require('../models/productModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const handlerFactory = require('./handlerFactory');

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
  const { name, name_ar, description, description_ar, category } = req.body;
  const coverImage = req.file;

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

  if (!coverImage)
    return next(new AppError('Please provide the Product cover image', 400));

  if (!category)
    return next(new AppError('Please provide the Product category', 400));

  next();
});

exports.uploadCreateProductImages = catchAsync(async (req, res, next) => {
  const coverImage = req.file;
  const images = req.files;

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
  const coverImage = req.file;
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
  const images = req.files;

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

exports.updateProduct = catchAsync(async (req, res, next) => {
  const {
    name,
    name_ar,
    description,
    description_ar,
    category,
    discount,
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
  if (variations) product.variations = variations;
  if (coverImageUrl) product.coverImage = coverImageUrl;
  if (imagesUrl && imagesUrl.length > 0) product.images = imagesUrl;
  if (active === true) product.active = true;
  if (active === false) product.active = false;

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

exports.deleteProduct = handlerFactory.deleteOne(Product);

exports.getAllProductUser = catchAsync(async (req, res, next) => {
  const products = await Product.find({ active: true });

  if (products.length === 0)
    return next(new AppError('No products were found', 404));

  res.status(200).json({
    status: 'success',
    data: {
      data: products,
    },
  });
});

exports.getAllProductAdmin = catchAsync(async (req, res, next) => {
  const products = await Product.find();

  if (products.length === 0)
    return next(new AppError('No products were found', 404));

  res.status(200).json({
    status: 'success',
    data: {
      data: products,
    },
  });
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
