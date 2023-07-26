const multer = require('multer');
const fileValidation = {
  image: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'],
  pdf: ['application/pdf'],
};

function myMulter(customValidation) {
  const storage = multer.diskStorage({});

  function fileFilter(req, file, cb) {
    if (customValidation.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb('invalid format', false);
    }
  }

  // Middleware function that handles both single and multiple image uploads
  const uploadMiddleware = multer({
    fileFilter,
    storage,
    limits: {
      files: 5, // Maximum 5 files in a single request
      fileSize: 30 * 1024 * 1024, // 30MB file size limit (adjust as needed)
    },
  }).fields([
    { name: 'image', maxCount: 1 }, // For single image upload
    { name: 'images', maxCount: 5 }, // For multiple images upload (maximum 5 allowed)
  ]);

  return uploadMiddleware;
}

module.exports = {
  myMulter,
  fileValidation,
};
