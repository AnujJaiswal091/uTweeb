import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    await user.save({ validateBeforeSave: false }); // because when saving it will validate password again and we dont need it

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
  console.log("accessToken:", accessToken);
  // console.log("refreshToken:", refreshToken);

  const loggedInUser = await User.findById(user._id) // here we have access to the user before the creation of our token so we again have to make a database query after generating them
    .select("-password -refreshToken");

  // console.log("loggedInUser:", loggedInUser);

  //6
  const options = {
    httpOnly: true, //only modifiable from the server but frontend can only read it
    secure: true, // ensure cookies are only sent over the HTTPS
  };

  // check for correct setting of cookies
  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
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
      $set: {
        // this mongodb operator can update the value of a particular feild
        refreshToken: undefined,
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

export { registerUser, loginUser, logoutUser };
