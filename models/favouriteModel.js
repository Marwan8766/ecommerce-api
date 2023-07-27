const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const favouriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A Favourite must have a user'],
      index: true,
      unique: true,
    },
    products: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: [true, 'A Favourite must have a product'],
      },
    ],
    //
  },
  {
    timestamps: true, // Add timestamps option
  }
);

const Favourite = mongoose.model('Favourite', favouriteSchema);
module.exports = Favourite;
