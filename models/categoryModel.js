const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: String,
    name_ar: String,
    image: String,
  },
  {
    timestamps: true, // Add timestamps option
  }
);

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
