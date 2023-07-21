const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A Category must have an English name'],
    },
    name_ar: {
      type: String,
      required: [true, 'A Category must have an Arabic name'],
    },
    image: {
      type: String,
      required: [true, 'A Category must have an Image'],
    },
  },
  {
    timestamps: true, // Add timestamps option
  }
);

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
