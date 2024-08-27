import multer from "multer";


// we will be using DISK STORAGE 
const storage = multer.diskStorage({
    destination: function (req, file, cb) { // (req, file, cb) here req is the json data inside the request, file is the file that came along with it as we cant handle it using basic express, cb is normal callback
      cb(null, "./public/temp") //yahan par multer temporary files store kardega
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname) // generally a unique name is used because using files with same names can overwrite files but here as the files will be with us for a very short amount of time that it dont matters much
    //   yahan par filename return ho jayga 
    }
  })
  
export const upload = multer({ 
    storage,
})
  