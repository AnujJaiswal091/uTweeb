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
// Upload a file to cloudinary
const uploadOnCloudinary = async(localFilePath, path) => {
  try {
      //check whether the file exists
      if (!localFilePath) return null
          // Upload a file
      const response = await cloudinary.uploader.upload(localFilePath, { asset_folder: path, resource_type: 'auto' })
          // file uploaded successfully
          // console.log("File uploaded successfully on cloudinary", response);
      fs.unlinkSync(localFilePath) // remove the file from the local storage
      return response // return the response which contian the url of the uploaded file
  } catch (error) {
      fs.unlinkSync(localFilePath) // remove the file from the local storage and it must be done before throwing the error
      return null
  }
}


// Delete from cloudnary
const deleteFromCloudinary = async(cloudinaryFilePath, path) => {
  // console.log(cloudinaryFilePath," ===================================");
  
  try {
      if (!cloudinaryFilePath) return null

      const avatarPublicId = cloudinaryFilePath.split("/").pop().split(".")[0];

      const response = await cloudinary.uploader.destroy(`${avatarPublicId}`)

      // console.log(avatarPublicId, "          ", response);
      
      return response

  } catch (error) {
      console.error("Error deleting file from Cloudinary:", error);
      return null;

  }
}

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

export { uploadOnCloudinary, deleteFromCloudinary };
