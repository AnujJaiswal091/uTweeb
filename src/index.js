// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDb from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './.env'
})

connectDb() //async function always returns a prommise hence we can use .then and .catch promise chaining with this
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(` Server is running at port : ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err)
})