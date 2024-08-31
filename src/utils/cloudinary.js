// WE WILL UPLOAD THE FILES IN TWO STEPS:

// 1 -> we will store it in put local server
// 2 -> from our local server we will upload to cloudinary

// this is done so that in case a error occured while uploading a file the user's data do not get lost and we can still make retries later to upload it in the cloudinary

import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs"; //file system in node, used here for getiing file path

// Configuration cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// STEP -> 2:
const uploadOnCloudinary = async (localFilePath) => {
  // localFilePath is local file path location on the server
  try {
    if (!localFilePath) {
      console.log("file does not exists");
      return null;
    }

    // upload the files on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // file has been uploaded succesfully
    // console.log("file is uploaded on cloudinary", response.url);
    fs.unlinkSync(localFilePath); // if uploaded successfully then too unlink from server
    console.log(response);

    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload got failed
    return null;
  }
};

// extracting publicId if.e. everything after the /upload/ in the public url without the extension
const extractPublicId = (url) => {
  let start = url.length;

  // Loop backward to find the first slash
  for (let i = url.length - 1; i >= 0; i--) {
    if (url[i] === "/") {
      start = i;
      break;
    }
  }

  // Remove extension part if exists
  let end = start;
  while (end < url.length && url[end - 1] !== ".") {
    end++;
  }

  // Return the substring between the last slash and the extension
  return url.substring(start, end - 1).split("/")[1];
};

// DELETE previous image FROM CLOUDINARY
const deleteCloudinaryImage = async (url) => {
  const publicId = await extractPublicId(url);
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Image with public ID ${publicId} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting image: ${error.message}`);
    throw new Error("Error deleting the previous image from Cloudinary.");
  }
};

// const uploadOrReplaceOnCloudinary = async (localFilePath, url) => {
//   try {
//     if (!localFilePath) {
//       console.log("File does not exist");
//       return null;
//     }

//     const publicId = await extractPublicId(url);

//     // Upload the file with the specified public ID (overwriting if it exists)
//     const response = await cloudinary.uploader.upload(localFilePath, {
//       resource_type: "auto",
//       public_id: publicId, // Specify the public ID to overwrite existing image
//       overwrite: true // Ensure the existing image is overwritten
//     });

//     // File has been uploaded successfully
//     console.log("File uploaded to Cloudinary", response.url);
//     return response;
//   } catch (error) {
//     console.error(`Error uploading file to Cloudinary: ${error.message}`);
//     return null;
//   }
// };

export { uploadOnCloudinary, deleteCloudinaryImage };
