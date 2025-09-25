const ImageKit = require("imagekit");

const {v4 :uuidv4} = require("uuid")

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL,
});

async function uploadImg({ buffer, filename }) {

  const response = await imagekit.upload({
    file: buffer,
    fileName: filename || uuidv4(),
    folder: "Super_Market",
  });

  return response;
}

module.exports = uploadImg;