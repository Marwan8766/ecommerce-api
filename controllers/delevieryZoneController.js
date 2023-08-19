const DelevieryZone = require('../models/delevieryZoneModel');
const Factory = require('./handlerFactory');

// middleware to filter req body
exports.filterReqBody = (req, res, next) => {
  const newBodyObj = {
    zoneName_en: req.body.zoneName_en,
    zoneName_ar: req.body.zoneName_ar,
    delevieryFee: req.body.delevieryFee,
    delevieryTimeInDays: req.body.delevieryTimeInDays,
  };

  req.body = newBodyObj;

  next();
};

// get deleviery zones
exports.getAllZones = Factory.getAll(DelevieryZone);

// create deleviery zone
exports.createZone = Factory.createOne(DelevieryZone);

// update deleviery zone
exports.updateZone = Factory.updateOne(DelevieryZone);

// delete deleviery zone
exports.deleteZone = Factory.deleteOne(DelevieryZone);
