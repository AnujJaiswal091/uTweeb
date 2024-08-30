import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// AUTHENTICATES AND VALIDATES the user
export const verifyJWT = asyncHandler(async (req, _, next) => {
  // because we dnt have have use of response that why "_"

  try {
    //we added token with cookies to req while logging in
    // is req.header is for mobile application where user sends custom header
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    // replace("Bearer ", "")  is used because we only want the token and Authorization header format is "Authorization:Bearer <Token>" so this way we can only get the token

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    // console.log(token)

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // console.log(decodedToken);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user; //added new object to the request
    // console.log("user => ", req.user);

    next(); //indicates that its work is done here now run the next thing
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid access token");
  }
});
