const Category = require('../models/categoryModel');
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

exports.checkCreateCategoryMiddleware = catchAsync(async (req, res, next) => {
  const { name, name_ar } = req.body;
  const image = req.files['image'][0];

  if (!name)
    return next(
      new AppError('Please provide the category name in English', 400)
    );

  if (!name_ar)
    return next(
      new AppError('Please provide the category name in Arabic', 400)
    );

  if (!image)
    return next(new AppError('Please provide the category Image', 400));

  next();
});

exports.createCategory = catchAsync(async (req, res, next) => {
  const { name, name_ar } = req.body;
  const image = req.files['image'][0];

  try {
    // Upload the photo to Cloudinary using the already configured cloudinary object
    const result = await cloudinary.uploader.upload(image.path, {
      folder: '',
    });

    const imageUrl = result.secure_url;

    // Create the category in the database with the Cloudinary image URL
    const newCategory = await Category.create({
      name,
      name_ar,
      image: imageUrl,
    });

    if (!newCategory)
      return next(new AppError('Error creating the category', 400));

    res.status(201).json({
      status: 'success',
      data: {
        data: newCategory,
      },
    });
  } catch (err) {
    console.error(err);
    return next(new AppError('Error uploading the image', 400));
  }
});

exports.uploadUpdateCategoryImage = catchAsync(async (req, res, next) => {
  const image = req.files['image'][0];
  const categoryId = req.params.id;

  const category = await Category.findById(categoryId);
  if (!category) return next(new AppError("Can't find this category", 404));

  req.category = category;

  if (!image) return next();

  const result = await cloudinary.uploader.upload(image.path, {
    folder: '',
  });

  const imageUrlToBeDeleted = category.image;

  await deleteImageCloudinary(imageUrlToBeDeleted);

  req.imageUrl = result.secure_url;
  next();
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  const { name, name_ar } = req.body;
  const { imageUrl, category } = req;

  if (name) category.name = name;
  if (name_ar) category.name_ar = name_ar;
  if (imageUrl) category.image = imageUrl;

  const updatedCategory = await category.save({ validateModifiedOnly: true });

  if (!updatedCategory)
    return next(new AppError('Error updating this category', 400));

  res.status(200).json({
    status: 'success',
    data: {
      data: updatedCategory,
    },
  });
});

exports.preDeleteImageMiddleware = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  const imageUrl = category.image;

  await deleteImageCloudinary(imageUrl);

  next();
});

exports.deleteCategory = handlerFactory.deleteOne(Category);

exports.getAllCategory = catchAsync(async (req, res, next) => {
  const categories = await Category.find();

  if (categories.length === 0)
    return next(new AppError('No Categories were found', 404));

  res.status(200).json({
    status: 'success',
    data: {
      data: categories,
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
