import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

// BCRYPT : is used for hashing our password and storing it in a encrypted format and also to enable matching this hashed password to the password user user enters while logging in

// JWT: BEARER TOKEN - like a key he who has it can recieve data
//  is also used for encryption purposed contains a header which contins the ending algorithm and a payload that contains the information to be encoded and also a secret key which is the most crucial

const userSchema = new Schema(
    {
        username:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true, // makes our searching this feild very efficient. OPTIMISES SEARCHING BUT MAKES OUR DATABASE HEAVY
        },

        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        fullName:{
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        avatar:{
            type: String, // cloudinary service url
            required: true,
        },

        coverImage: {
            type: String // cloudinary service url
        },

        watchHistory:[ // watch history is a array that contains the id of every video that a user watched
            {
                type: Schema.Types.ObjectId,
                ref: "V ideo"
            }
        ],

        password:{
            type: String,
            required: [true, 'Password is required'],
        },

        refreshToken:{
            type: String,
        }
    },
    {timestamps: true}
)

// pre is a middleware hooks in mongoose that does a particular function just before a certain defined action 
// we will use it to hash  our password just before saving it in databse
userSchema.pre("save", async function (next) { //kyoki middleware hai isliye next ka access hai taki kaam hote hi ye next flag aage pass kardo

    if(!this.isModified("password"))  return next(); // password modify nahi hua to return ho jao

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

// function(){} writing function in this way LETS US USE "this" REFERENCE to reference out our data, arrow functions DO NOT have this 

userSchema.methods.isPasswordCorrect = async function (password) {
   return await bcrypt.compare(password, this.password)
}

// BOTH ARE JWT TOKENS
userSchema.methods.generateAccessToken = async function(){
    return jwt.sign(
        {
            _id: this._id, // from mongodb
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },

        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}


userSchema.methods.generateRefreshToken = async function(){
    return jwt.sign(
        {
            _id: this._id, // from mongodb
        },
        
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema) // this database name will be saved as a ALL LOWERCASE, PLURAL WORD i.e. "users"