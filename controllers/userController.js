const User = require("../models/UserSchema.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const bloodGroups = [
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
    "A1+",
    "A1-",
    "A2+",
    "A2-",
    "A1B+",
    "A1B-",
    "A2B+",
    "A2B-",
    "Bombay Blood Group (hh)",
    "Rh-null"
  ];

//post -> /api/user/regsiter
async function registerUser(req, res ,next ) {
    try{
        const {
            name,
            email,
            password,
            confirmPassword,
            mobile_number,
            address,
            dob,
            gender,
            blood_group,
          } = req.body;
        
          if (
            !name ||
            !email ||
            !password ||
            !confirmPassword ||
            !mobile_number ||
            !address ||
            !dob ||
            !gender ||
            !blood_group
          ) {
            return res.status(422).json({
              error: "Fill all the details!",
            });
          }
          if (password.length < 8) {
            return res
              .status(422)
              .json({ error: "Password must be at least 8 characters long." });
          }
          if (!email.includes("@")) {
            return res.status(422).json({ error: "Invalid email address." });
          }
        
          if (password != confirmPassword) {
            return res
              .status(422)
              .json({ error: "Passwords and confirm passwords do not match" });
          }
          if (mobile_number.length !== 10) {
            return res.status(422).json({ error: 'Invalid mobile number.' });
          }

          if(!bloodGroups.includes(blood_group)){
            return res.status(422).json({ error: 'Invalid Blood Group.' });
          }
        
          const existingUser = await User.findOne({ email });
        
          if (existingUser) {
            return res.status(422).json({ error: "User already exists." });
          }
        
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
        
          const newUser = new User({
            name,
            email : email.toLowerCase(),
            password : hashedPassword,
            mobile_number,
            address,
            dob,
            gender,
            blood_group,
          });
        
          await newUser.save();
        
          return res.status(201).json({ success: "User registered successfully!" , User});
    }

    catch(err){
        console.log("Error Occured" , err);
        res.status(500).json({ error: 'Internal server error.' });
    }
  
}


// Post -> /api/user/login
async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;

    const userEmail = email.toLowerCase();

    const user = await User.findOne({ email: userEmail });

    if (!email.includes("@")) {
      return res.status(422).json({
        error: "Please Enter a Valid email id",
      });
    } else if (!user) {
      return res.status(404).json({
        error: "User does not exists!",
      });
    } else {
      const comparePass = await bcrypt.compare(password, user.password);
      if (!comparePass) {
        return res.status(422).json({
          error: "Invalid Credentials!",
        });
      } else {
        const { _id: id, name } = user;
        const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
          expiresIn: "1d",
        });

        return res
          .status(200)
          .json({
            token,
            id,
            name,
            success: `Successfully Signed in as ${userEmail} `,
          });
      }
    }
  } catch (err) {
    console.log(err);
  }
}

// Post -> /api/user/reset-password

async function requestPasswordReset(req,res,next) {
    const {email} = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(404).json({ error: 'User not found.' });
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex'); 

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 1800000;  // 30 min
        await user.save();

        const resetUrl = `http://localhost:3000/api/user/reset-password/${resetToken}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            secure : true,
            port : 465,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });

          await transporter.sendMail({
            to: user.email,
            subject: 'Password Reset Request',
            text: `You can reset your password using this link: ${resetUrl}`,
          });
          
          res.status(200).json({ message: 'Password reset email sent.' , mailContent : `You can reset your password using this link: ${resetUrl}`});

}
    catch(err){
        console.log(err);
        return res.status(500).json({error : "Internal Server Error"})
    }

}



// Post -> /api/user/reset-password/:token

async function resetPassword(req, res) {
    const { token } = req.params;
    const { newPassword } = req.body;
  
    try {
        
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }, 
      });
  
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
      }
  
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
  
      // Clear the token fields
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
  
      res.status(200).json({ message: 'Password reset successful.' });
    } catch (error) {
      res.status(500).json({ message: 'Error resetting password.', error });
    }
  }
  
module.exports = {registerUser , loginUser , requestPasswordReset , resetPassword};