const mongoose = require('mongoose');

const delevieryZoneSchema = new mongoose.Schema(
  {
    zoneName_en: {
      type: String,
      required: [true, 'A Deleviery Zone must have an English Name'],
    },

    zoneName_ar: {
      type: String,
      required: [true, 'A Deleviery Zone must have an Arabic Name'],
    },

    delevieryFee: {
      type: Number,
      min: 0,
      required: [true, 'A Deleviery Zone must have a Deleviery Fee'],
    },

    delevieryTimeInDays: {
      type: Number,
      min: 0,
      required: [true, 'A Deleviery Zone must have a Deleviery Time in Days'],
    },
    //
  },
  {
    timestamps: true, // Add timestamps option
  }
);

const DelevieryZone = mongoose.model('DelevieryZone', delevieryZoneSchema);
module.exports = DelevieryZone;
