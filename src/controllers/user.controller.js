import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  // we will not use asyncHandler here as we are not mmaking any web request just a internal method
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    // Log tokens to check their values
    // console.log('Access Token:', accessToken);
    // console.log('Refresh Token:', refreshToken);

    // now we will save refreshToken in db so that we dont need the password everytime
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); // because when saving it will validate password again and we dont want it

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
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
  const { username, fullName, email, password } = req.body; // taking details from json or form
  // console.log("email: ", email);

  //2
  // checking one by one
  // if (fullName === ""){
  //     throw new ApiError(400, "full name is required")
  // }

  // check all at same time
  if (
    [username, fullName, email, password].some(
      (
        feild // we didnt used curly braces so no need for return statement
      ) => feild.trim() === ""
    )
  ) {
    throw new ApiError(400, "All feilds are required");
  }

  // 3
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  //4
  const avatarLocalPath = req.files?.avatar[0]?.path; // from multer
  console.log(avatarLocalPath);

  // const coverImageLocalPath = req.files?.coverImage[0]?.path;  // from multer
  // console.log(coverImageLocalPath);

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //5
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //6
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", // as we are not explicitly checking for coverImage unlike avatar hence we have to take care of it
    email,
    password,
    username: username.toLowerCase(),
  });

  //7
  const createdUser = await User.findById(user._id).select(
    // excudind password and refresh token.
    //  "-" sign in front of any feild will exclude it
    "-password -refreshToken"
  );
  //8
  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  //9

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //1  fetch data from req.body
  //2  username or email
  //3  find the user
  //4  check password
  //5  access and refresh token
  //6  send secure cookies
  //7  send successful response

  //1
  const { email, username, password } = req.body;
  // console.log(email);

  //2
  if (!username && !email) {
    // alternative of same -> if (!(username || email)){}
    throw new ApiError(400, "username or email required");
  }

  //3
  const user = await User.findOne({
    $or: [{ username }, { email }], // inme se jo bhi pehle mil jaye
  });

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  //4
  const isPasswordValid = await user.isPasswordCorrect(password);
  // we will use "user" here but not "User" as User is the schema of the mongodb and referncing it will give us mongodb methods but nou our user created methods
  // so we will use "user" that is the instance that we fetched from the databse it will have our created methods
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  //5
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  // console.log("accessToken:", accessToken);
  // console.log("refreshToken:", refreshToken);

  const loggedInUser = await User.findById(user._id) // here we have access to the user before the creation of our token so we again have to make a database query after generating them
    .select("-password -refreshToken");

  // console.log("loggedInUser:", loggedInUser);

  //6
  const options = {
    httpOnly: true, //only modifiable from the server and will not allow client-side JavaScript to see the cookie in document.cookie
    secure: true, // ensure cookies are only sent over the HTTPS
  };

  // check for correct setting of cookies
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // here we can access req.user that we created while executing the verifyJWT middleware and added to the req
  await User.findByIdAndUpdate(
    req.user._id,
    {
      // $set: {
      //   // this mongodb operator can update the value of a particular feild
      //   refreshToken: null,
      // },

      // we can also use
      $unset: {
        refreshToken: 1, // this removes the feild from document
      },
    },
    {
      new: true, // return value will have the updated value
    }
  );

  const options = {
    httpOnly: true, //only modifiable from the server but frontend can read it
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

// THIS WILL BE used by frontEnd dev when the request hits 401 unauthorized access
// instead of promptiong again for login he can
// hit refreshAccessToken api endPoint to refresh both the access and refresh token
// if the user have a valid refreshToken
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // verifying that the refreshToken recieved from cookies and from the database of user is same or not
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    // Send the new tokens in the response
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    console.error("Error during token refresh: ", error);
    throw new ApiError(401, error.message || "Invalid refresh token");
  }
});

// REMEMBER TO USE VerifyJWT middleware when using all the functions that take req.user because its checking wether the user is authenticated or not
// and also thats where this user opbject is injected into the request

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // if user is trying to change password that means he is logged in

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword); //method we made on user model

  if (!isPasswordCorrect) {
    throw new ApiError(404, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false }); //we only want to validate password
  // This validation includes schema validations such as required fields, data types, custom validators, etc.


  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  console.log("user: ", req.user);

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully")); // we injected user on the req using middleware
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body; // yeh user input ya frontend se lelenge

  if (!fullName || !email) {
    throw new ApiError(400, "All feilds are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName, // this syntax will work
        email: email, // this syntax will also work
      },
    },
    { new: true } // returns the updated info
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

////////// UPADTE USER AVATARIMAGES //////////
// 1. get the new avatar image from frontend
// 2. upload the image on local storage
// 3. upload the image on cloudinary
// 3.3 delete the old avatar image from cloudinary
// 4. update the user avatar in the database // req.user is added by verifyJWT middleware
const updateUserAvatar = asyncHandler(async (req, res) => {
  // 1. get the new avatar image from frontend
  // 2. upload the image on local storage
  const newAvatarLocalPath = req.file?.path;

  if (!newAvatarLocalPath) {
    throw new ApiError(400, "please upload avatar");
  }

  // 3. upload the image on cloudinary
  const newAvatarCloudnary = await uploadOnCloudinary(
    newAvatarLocalPath,
    "img"
  );

  if (!newAvatarCloudnary) {
    throw new ApiError(400, "please upload avatar");
  }

  // 3.3 delete the old avatar image from cloudinary
  // // get the old avatar image from the database
  const oldAvatarUrl = req.user?.avatar;

  // // delete the old avatar image from cloudinary
  const deleteOldAvatar = await deleteFromCloudinary(oldAvatarUrl, "img");

  if (!deleteOldAvatar) {
    throw new ApiError(400, "avatar not found");
  }

  // 4. update the user avatar in the database
  const updateImage = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: newAvatarCloudnary.url } },
    { new: true }
  ).select("-password");

  // 5. update the user avatar in the database
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: newAvatarCloudnary.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});
///////////////////////////////////////////////////////////////////

////////// UPADTE USER COVERIMAGES //////////
// 1. get the new avatar image from frontend
// 2. upload the image on local storage
// 3. upload the image on cloudinary
// 4. update the user avatar in the database // req.user is added by verifyJWT middleware
const updateUserCoverImage = asyncHandler(async (req, res) => {
  try {
    // 1. get the new cover image from frontend
    // 2. upload the image on local storage
    const newCoverImageLocalPath = req.file?.path;

    if (!newCoverImageLocalPath) {
      throw new ApiError(400, "please upload CoverImage");
    }

    // 3. upload the image on cloudinary
    const newCoverImageCloudnary = await uploadOnCloudinary(
      newCoverImageLocalPath,
      "img"
    );

    if (!newCoverImageCloudnary) {
      throw new ApiError(400, "Image not uploaded on cloudinary");
    }

    // 3.3 delete the old cover image from cloudinary
    // // get the old cover image from the database
    const oldCoverUrl = req.user?.avatar;

    // // delete the old Cover image from cloudinary
    const deleteOldCover = await deleteFromCloudinary(oldCoverUrl, "img");

    if (!deleteOldCover) {
      throw new ApiError(400, "coverimage not found");
    }

    // 4. update the user avatar in the database // req.user is added by verifyJWT middleware
    const updateImage = await User.findByIdAndUpdate(
      req.user?._id,
      { $set: { avatar: newCoverImageCloudnary.url } },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(
        new ApiResponse(200, updateImage, "CoverImage upadte successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(new Apierror(500, {}, "error in updating cover image"));
  }
});

///////////////////////////////////////////////////////////////////

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params; // here we are taking from params

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  // AGGREGATION PIPELINES ========================================================
  // every output of a stage of aggregation pipelines can be used as a input for the next stage
  // every aggregation pipelines creates a document of the query as a result

  // supoose the user is looking at the page of tedx so here username = tedx and user = user

  // the results of aggregation is a array
  const channel = await User.aggregate([
    //PIPELINES :
    // finding tedx
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },

    // FINDING SUBSCRIBERS OF A tedx
    {
      $lookup: {
        from: "subscriptions", // this is "Subscription" but as document is stored as a lowerCase and in plural form
        localField: "_id",
        foreignField: "channel", // counting every document with channel: same as the tedx will give us subscribers of the tedx
        as: "subscribers",
      },
    },

    // finding the no. of channels to which the tedx have subscribedTo
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber", // counting every document with subscriber: same as tedx will give us channels to which the tedx has subscribedTo
        as: "subscribedTo",
      },
    },

    // adding these feilds to tedx's userModel schema
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },

        // checking if the current user has subscribed to the tedx
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] }, // this means inside doucument "subscribers" -> where "channel" name was tedx is there a "subscriber" whose name is same as user
            then: true,
            else: false,
          },
        },
      },
    },

    // this will be used to give only selected things not everything
    {
      $project: {
        fullName: 1,
        usernmae: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  // console.log(channel);

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "user channel fetched successfully")
    );
});

// -----IMP------
// req.user._id does NOT returns mongodb ObjectId
// it returns a string but because we are using mongoose it automatically converts it to the mongodb id

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id), // here we cant directly use req.user._id as here mongoose does not works directly, so we have to create a mongoose objectId
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        // here we have to use anested pipeline because even though we fetch the vidoes document it contains owner feild which points again to the user
        // and without the nested pipeline it will return a incomplete data
        pipeline: [
          {
            // now as we are inside the lookup pipeline so we have to lookup inside the User
            $lookup: {
              from: "users",
              localField: "owner", // as we are inside videos
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  // this pipeline is to remove unnecessary things from owner feild
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          // as now owner is a array with the useful data at its first index
          // this pipeline is only for the ease of frontend dev
          {
            $addFields: {
              owner: {
                // will overwrite the owner feild and only give it useful data that is in the first index of the owner feild array
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watched histoy fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
