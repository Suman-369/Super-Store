const multer = require('multer');

// Configure multer to use memory storage (for ImageKit upload)
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

module.exports = upload;
