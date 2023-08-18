// const fs = require('fs');
// const AppError = require('../utils/appError');
// const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
// const Factory = require('./handlerFactory');

// const filterobj = (obj, ...allowedFields) => {
//   const newobj = {};
//   Object.keys(obj).forEach((el) => {
//     if (allowedFields.includes(el)) newobj[el] = obj[el];
//   });
//   return newobj;
// };

exports.UpdateUser = catchAsync(async (req, res, next) => {
  const { address, name, gender } = req.body;
  const { user } = req;

  if (address) user.address = address;
  if (name) user.name = name;
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

// exports.Updateuser = Factory.updateOne(User);
// exports.GetAllUsers = Factory.getAll(User);
// exports.deleteuser = Factory.deleteOne(User);
// exports.createuser = Factory.createOne(User);
