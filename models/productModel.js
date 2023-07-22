const mongoose = require('mongoose');
const AppError = require('../utils/appError');

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
        color: {
          type: String,
          enum: ['red', 'green', 'blue', 'yellow', 'black', 'white'],
          default: null,
        },
        size: {
          type: String,
          enum: ['S', 'M', 'L', 'XL', 'XXL'],
          default: null,
        },
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

// HANDLE DUPLICATE COLORS AND SIZES
productSchema.pre('save', function (next) {
  const variations = this.variations;
  let hasColorOnly = false;
  let hasSizeOnly = false;
  let hasBothColorAndSize = false;
  let hasBothNull = false;

  for (const variation of variations) {
    const { color, size } = variation;

    if (color === null && size === null) {
      // Variation with neither color nor size
      hasBothNull = true;
      variation.color = null;
      variation.size = null;
    } else if (color !== null && size === null) {
      // Variation with color only
      hasColorOnly = true;
      variation.size = null;
    } else if (color === null && size !== null) {
      // Variation with size only
      hasSizeOnly = true;
      variation.color = null;
    } else {
      // Variation with both color and size
      hasBothColorAndSize = true;
    }
  }

  if (hasBothNull && variations.length !== 1)
    return next(
      new AppError(
        'If both color and size are null then only one variation is allowed',
        400
      )
    );

  if (hasBothColorAndSize && (hasColorOnly || hasSizeOnly)) {
    return next(
      new AppError(
        'All variations must have either color only or size only or have both.',
        400
      )
    );
  }
  if (hasColorOnly && (hasBothColorAndSize || hasSizeOnly)) {
    return next(
      new AppError(
        'All variations must have either color only or size only or have both.',
        400
      )
    );
  }
  if (hasSizeOnly && (hasBothColorAndSize || hasColorOnly)) {
    return next(
      new AppError(
        'All variations must have either color only or size only or have both.',
        400
      )
    );
  }

  next();
});

// Pre-save middleware to handle variations
productSchema.pre('save', function (next) {
  const variations = this.variations;
  const variationMap = new Map();

  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i];
    const { color, size } = variation;

    if (color !== null && size !== null) {
      // Variation with both color and size
      const key = `${color}-${size}`;
      if (variationMap.has(key)) {
        const existingIndex = variationMap.get(key);
        variations[existingIndex].quantity += variation.quantity;
        variations.splice(i, 1);
        i--;
      } else {
        variationMap.set(key, i);
      }
    } else if (color !== null && size === null) {
      // Variation with color only
      const key = `color-${color}`;
      if (variationMap.has(key)) {
        const existingIndex = variationMap.get(key);
        variations[existingIndex].quantity += variation.quantity;
        variations.splice(i, 1);
        i--;
      } else {
        variationMap.set(key, i);
      }
    } else if (size !== null && color === null) {
      // Variation with size only
      const key = `size-${size}`;
      if (variationMap.has(key)) {
        const existingIndex = variationMap.get(key);
        variations[existingIndex].quantity += variation.quantity;
        variations.splice(i, 1);
        i--;
      } else {
        variationMap.set(key, i);
      }
    }
  }

  next();
});

productSchema.pre('save', function (next) {
  if (this.images.length === 0) this.images.push(this.coverImage);
  next();
});

productSchema.pre('save', function (next) {
  if (this.variations.length === 0) this.active = false;
  next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
