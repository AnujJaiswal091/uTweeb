import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({  // middlewares hamesha .use keyword se hi use karte
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

//CONFIGURATIONS
app.use(express.json({limit: "16kb"})) // limit to our json file
app.use(express.urlencoded({extended: true, limit:"16kb"})) // so that our server understands diff url encoding
app.use(express.static("public"))
app.use(cookieParser()) // so that our server can use CRUD operations on the user's browser's cookies


export { app }