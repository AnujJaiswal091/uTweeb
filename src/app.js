import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    // middlewares hamesha .use keyword se hi use karte
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

//CONFIGURATIONS
app.use(express.json({ limit: "16kb" })); // limit to our json file
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // so that our server understands diff url encoding
app.use(express.static("public"));
app.use(cookieParser()); // so that our server can use CRUD operations on the user's browser's cookies

//ROUTES IMPORT
import userRouter from "./routes/user.routes.js"; //we can give a custom name only when export is DEFAULT in the module

import healthcheckRouter from "./routes/healthCheck.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

// ROUTER DECLARATION
app.use("/api/v1/users", userRouter); // because we have segregated the routes and controllers therfore
// we cant directly use app.get() we have to USE A middlewares. this is the syntax

app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

export { app };
