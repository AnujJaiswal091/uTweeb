import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    // used middleware(multer) just before the register user
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
// the url will be like -> http://localhost:8000/api/v1/users/register

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser); //here verifyJWT is a middleware that will run before logoutUser
router.route("/refresh-token").post(refreshAccessToken);

export default router;
