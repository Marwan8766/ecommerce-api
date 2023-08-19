const express = require('express');

const authController = require('../controllers/authController');
const delevieryZoneController = require('../controllers/delevieryZoneController');

///////////////////

const router = express.Router();

router.get('/', delevieryZoneController.getAllZones);

// Protect all routes after this middleware
router.use(authController.protect);

router.post(
  '/',
  delevieryZoneController.filterReqBody,
  delevieryZoneController.createZone
);

router
  .route('/:id')
  .patch(
    delevieryZoneController.filterReqBody,
    delevieryZoneController.updateZone
  )
  .delete(delevieryZoneController.deleteZone);

module.exports = router;
