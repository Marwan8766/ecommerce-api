const mongoose = require('mongoose');
const validator = require('validator');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/appError');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please write your name'],
  },

  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true, // convert to lowercase but not a validator
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    validate: [
      validator.isStrongPassword,
      'Please write a password with at least 1 lowercase , 1 uppercase , 1 symbol and min length of 8 characters',
    ],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // only works for create and save
      // if update is used it won't work
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords aren't the same!",
    },
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    // default: 'male',
  },

  address: [
    {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      name: {
        type: String,
        default: 'Home',
      },
      city: {
        type: String,
        required: [true, 'An Address must have a City name'],
      },
      street: {
        type: String,
        required: [true, 'An Address must have a Street name'],
      },
      buildingNumber: {
        type: Number,
        required: [true, 'An Address must have a Building Number'],
      },
      floorNumber: {
        type: Number,
        required: [true, 'An Address must have a Floor Number'],
      },
    },
  ],

  passwordChangedAt: Date,
  // passwordResetOtp: String,
  // passwordResetOtpExpires: Date,
  emailConfirmOtp: String,
  emailConfirmOtpExpires: Number,
  emailConfirmed: {
    type: Boolean,
    default: false,
    select: false,
  },

  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  // this refers to the current document(the current user)

  // only run this function if the password was modified
  if (!this.isModified('password')) return next();

  // hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // delete the passwordConfirm as we just needed it for validation but
  // not to persist it to the database
  this.passwordConfirm = undefined;

  // calling next to not to stop our mongoose middleware here
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  // we subtract 1 sec bec the saving into DB can take more time than creating the token
  // so this won't be accurate but it ensures that the token is generated
  // after the passwordChangedAt
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// create instance on userSChema
// this method will be available on all documents of user
userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.passwordHasChanged = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedAt = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    // the greater timestamp the newest
    return jwtTimestamp < changedAt;
  }

  // user does not have passwordChangetAt
  return false;
};

userSchema.methods.createEmailConfirmtOtp = function () {
  // Generate random 5-digit number
  const resetOtp = Math.floor(10000 + Math.random() * 90000).toString();

  // Set expiration date after 10 minutes
  // const otpExpiration = Date.now() + 10 * 60 * 1000;

  // Set expiration date after 90 seconds
  const otpExpiration = Date.now() + 90 * 1000; // 90 seconds

  // Save hashed OTP and expiration date to the user document
  this.emailConfirmOtp = crypto
    .createHash('sha256')
    .update(resetOtp)
    .digest('hex');
  this.emailConfirmOtpExpires = otpExpiration;

  // Return the unhashed OTP to send it via email
  return resetOtp;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
