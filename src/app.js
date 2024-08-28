import express from "express"
import cors from "cors"
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({  // middlewares hamesha .use keyword se hi use karte
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

//CONFIGURATIONS
app.use(express.json({limit: "16kb"})) // limit to our json file
app.use(express.urlencoded({extended: true, limit:"16kb"})) // so that our server understands diff url encoding
app.use(express.static("public"))
app.use(cookieParser());// so that our server can use CRUD operations on the user's browser's cookies


//ROUTES IMPORT 
import userRouter from './routes/user.routes.js' //we can give a custom name only when export is DEFAULT in the module



// ROUTER DECLARATION
app.use("/api/v1/users", userRouter) // because we have segregated the routes and controllers therfore 
                                // we cant directly use app.get() we have to USE A middlewares. this is the syntax

export { app }