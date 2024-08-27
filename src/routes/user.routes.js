import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router()

router.route("/register").post(registerUser)
// the url will be like -> http://localhost:8000/api/v1/users/register


export default router