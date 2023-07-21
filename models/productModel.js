const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A Product must have an English name'],
    },
    name_ar: {
      type: String,
      required: [true, 'A Product must have an Arabic name'],
    },
    description: {
      type: String,
      required: [true, 'A Product must have an English description'],
    },
    description_ar: {
      type: String,
      required: [true, 'A Product must have an Arabic description'],
    },
    images: [String],
    coverImage: String,
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: 'Category',
      required: [true, 'A Product must be in a specific Category'],
    },
    variations: [
      {
        color: String,
        size: String,
        quantity: {
          type: Number,
          min: 0,
          required: [true, 'A Product variation must have a quantity'],
        },
        price: {
          type: Number,
          min: 1,
          required: [true, 'A Product variation must have a price'],
        },
      },
    ],
    //
  },
  {
    timestamps: true, // Add timestamps option
  }
);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;

// HANDLE DUPLICATE COLORS AND SIZES
