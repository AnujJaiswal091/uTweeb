import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils"
import {User}  from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async(req, res) => {
   //1  get user details from frontend, check what you need from the user  model
   //2  validation -> required feilds, correct formats
   //3  check if user already exists: username, email
   //4  check for files(images), check for avatar(required)
   //5  upload them to cloudinary, check for avatar(required)
   //6  create user object - for uploading it in mongodb -> create entry in db
   //7  remove password(encrypted) and refresh token field from response 
   //8  check for user creation 
   //9  return res

    //1
    const{username, fullname, email, password} = req.body // taking details from json or form
    console.log("email: ", email);


    //2
    // checking one by one 
    // if (fullname === ""){
    //     throw new ApiError(400, "full name is required")
    // }

    // check all at same time
    if (
        [username, fullname, email, password].some((feild) =>  // we didnt used curly braces so no need for return statement
        feild.trim() === "")
    ) {
        throw new ApiError(400, "All feilds are required")
    }

    // 3
    const existedUser = User.findOne({
        $or:[{ username }, { email }]
    })

    if (existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    //4
    const avatarLocalPath = req.files?.avatar[0]?.path  // from multer
    console.log(avatarLocalPath);

    const coverImageLocalPath = req.files?.coverImage[0]?.path  // from multer
    console.log(coverImageLocalPath);

    if (!avatarLocalPath)
    {
        throw new ApiError(400, "Avatar file is required")
    }


    //5
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar){
        throw new ApiError(400, "Avatar file is required")
    }
    

    //6
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", // as we are not explicitly checking for coverImage unlike avatar hence we have to take care of it
        email,
        password,
        username: username.toLowerCase()
    })


    //7
    const createdUser = await User.findById(user._id)
    .select( // excudind password and refresh token "-" sign in front of any feild will exclude it
        "-password -refreshToken"
    )
    //8 
    if(!createdUser){
        throw new ApiError(500, "something went wrong while registering the user")
    }

    //9

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

} )

export {registerUser,}