const { pathToFileURL } = require('url');
const path = require('path');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;

{
  const __dirname = path.dirname(pathToFileURL(require.main.filename).pathname);
  dotenv.config({ path: path.join(__dirname, '../config.env') });

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

module.exports = cloudinary;
