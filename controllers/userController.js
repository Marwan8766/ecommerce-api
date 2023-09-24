// const fs = require('fs');
// const AppError = require('../utils/appError');
// const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
// const Factory = require('./handlerFactory');

// const filterobj = (obj, ...allowedFields) => {
//   const newobj = {};
//   Object.keys(obj).forEach((el) => {
//     if (allowedFields.includes(el)) newobj[el] = obj[el];
//   });
//   return newobj;
// };

exports.UpdateUser = catchAsync(async (req, res, next) => {
  const { firstName, lastName, phoneNumber, gender } = req.body;
  const { user } = req;

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (gender) user.gender = gender;

  const updatedUser = await user.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: 'success',
    data: {
      data: updatedUser,
    },
  });
});

exports.GetUser = (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      data: req.user,
    },
  });
};

exports.addAddress = catchAsync(async (req, res, next) => {
  const { address } = req.body;
  const { user } = req;

  if (!user.address) {
    user.address = [address];
  } else {
    user.address.push(address);
  }

  const updatedUser = await user.save({ validateModifiedOnly: true });
  if (!updatedUser)
    return next(
      new AppError('something went wrong while updating your address', 400)
    );

  res.status(200).json({
    status: 'success',
    data: {
      data: updatedUser,
    },
  });
});

exports.removeAddress = catchAsync(async (req, res, next) => {
  const addressId = req.params.id;
  const { user } = req;

  // Use findOneAndUpdate to remove the address and get the updated document
  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id },
    { $pull: { address: { _id: addressId } } },
    { new: true } // This option returns the updated document
  );

  if (!updatedUser) {
    return next(new AppError('Address not found', 404));
  }

  res.status(204).json({
    status: 'success',
    message: 'Address removed successfully',
  });
});

// exports.Updateuser = Factory.updateOne(User);
// exports.GetAllUsers = Factory.getAll(User);
// exports.deleteuser = Factory.deleteOne(User);
// exports.createuser = Factory.createOne(User);
