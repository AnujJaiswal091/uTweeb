// WE WILL UPLOAD THE FILES IN TWO STEPS:

// 1 -> we will store it in put local server 
// 2 -> from our local server we will upload to cloudinary 

// this is done so that in case a error occured while uploading a file the user's data do not get lost and we can still make retries later to upload it in the cloudinary

import { v2 as cloudinary } from "cloudinary";
import fs from "fs"   //file system in node, used here for getiing file path


// Configuration cloudinary
 cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY , 
    api_secret: process.env.CLOUDINARY_API_SECRET
});



// STEP -> 2:
const uploadOnCloudinary = async (localFilePath) => { // localFilePath is local file path location on the server
    try {
        if (!localFilePath) {
            console.log("file does not exists")
            return null
        }

        // upload the files on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        // file has been uploaded succesfully
        // console.log("file is uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath) // if uploaded successfully then too unlink from server 
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload got failed
        return null;
    }
}

export {uploadOnCloudinary}