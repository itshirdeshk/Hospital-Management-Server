const { User, UserFHIR } = require("../models/UserSchema.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();
const axios = require("axios");

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
  "Rh-null",
];

//post -> /api/user/register
async function registerUser(req, res, next) {
  try {
    const {
      firstName,
      lastName,
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
      (!firstName,
      !lastName ||
        !email ||
        !password ||
        !confirmPassword ||
        !mobile_number ||
        !address ||
        !dob ||
        !gender ||
        !blood_group)
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
      return res.status(422).json({ error: "Invalid mobile number." });
    }

    if (!bloodGroups.includes(blood_group)) {
      return res.status(422).json({ error: "Invalid Blood Group." });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(422).json({ error: "User already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      mobile_number,
      address,
      dob,
      gender,
      blood_group,
    });

    await newUser.save();

    return res
      .status(201)
      .json({ success: "User registered successfully!", User });
  } catch (err) {
    console.log("Error Occured", err);
    res.status(500).json({ error: "Internal server error." });
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

        return res.status(200).json({
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

async function requestPasswordReset(req, res, next) {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1800000; // 30 min
    await user.save();

    const resetUrl = `http://localhost:3000/api/user/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      port: 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: user.email,
      subject: "Password Reset Request",
      text: `You can reset your password using this link: ${resetUrl}`,
    });

    res.status(200).json({
      message: "Password reset email sent.",
      mailContent: `You can reset your password using this link: ${resetUrl}`,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// Post -> /api/user/reset-password/:token

async function resetPassword(req, res) {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear the token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password.", error });
  }
}

//Create Patient Resource
//Post -> /api/user/medical-info
async function UserMedicalInfo(req, res, next) {
  const userInput = req.body;
  const userId = req.user.id;

  if (!userInput.medicalInfo) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const recordExists = await UserFHIR.findOne({ UserId: userId });
  if (recordExists) {
    console.log(recordExists);
    return res.status(422).json({
      error: "Duplicate Entry not allowed",
    });
  }

  const user = await User.findOne({ _id: userId });
  try {
    const patientResource = {
      resourceType: "Patient",
      name: [
        {
          family: user.lastName,
          given: [user.firstName],
        },
      ],
      birthDate: userInput.birthDate,
      gender: user.gender.toLowerCase(),
      address: [
        {
          line: [user.address.line],
          city: user.address.city,
          state: user.address.state,
          postalCode: user.address.postalCode,
          country: user.address.country,
        },
      ],
      telecom: [
        {
          system: "phone",
          value: user.mobile_number,
          use: "mobile",
        },
        {
          system: "email",
          value: user.email.toLowerCase(),
        },
      ],
      extension: [
        {
          url: "https://api.myhealthsystem.com/fhir/extensions/chronic-conditions",
          valueString: userInput.medicalInfo.chronicConditions.join(", "),
        },
        {
          url: "https://api.myhealthsystem.com/fhir/extensions/allergies",
          valueString: userInput.medicalInfo.allergies.join(", "),
        },
        {
          url: "https://api.myhealthsystem.com/fhir/extensions/medications",
          valueString: userInput.medicalInfo.medications.join(", "),
        },
        {
          url: "https://api.myhealthsystem.com/fhir/extensions/family-history",
          valueString: userInput.medicalInfo.familyHistory.join(", "),
        },
        {
          url: "https://api.myhealthsystem.com/fhir/extensions/blood-group",
          valueString: user.blood_group,
        },
      ],
    };

    const response = await axios.post(
      `${process.env.FHIR_SERVER_URL}/Patient`,
      patientResource,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const newFHIR = new UserFHIR({
      UserId: userId,
      FHIR_id: response.data.id,
    });

    await newFHIR.save();
    res.status(200).json({
      message: "Patient data sent successfully to FHIR server",
      fhirResponse: response.data,
    });
  } catch (error) {
    console.error("Error sending data to FHIR server:", error);
    res.status(500).json({ error: "Failed to send data to FHIR server" });
  }
}

//Get Patient Details
//Get -> /api/user/get-info
async function getUserMedicalInfo(req, res, next) {
  try {
    const userId = req.user.id;

    const recordExists = await UserFHIR.findOne({ UserId: userId });

    if (!recordExists) {
      return res.send(404).json({
        error: "No Record Found",
      });
    }

    const fhirId = recordExists.FHIR_id;
    console.log(fhirId);

    const response = await axios.get(
      `${process.env.FHIR_SERVER_URL}/Patient/${fhirId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response);
    res.status(200).json({
      success: "Patient data fetched successfully from FHIR server",
      fhirResponse: response.data,
    });
  } catch (Err) {
    console.log(Err);
  }
}

//POST -> /api/user/get-nearby-hospitals
async function getNearbyHospitals(req, res, next) {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(422).json({
        error: "Location Needed",
      });
    }

    const query = `[out:json];
                  node["amenity"="hospital"](around:10000,${latitude},${longitude});
                  out;`;

    const url = process.env.NEARBY_HOSPITALS_URL;
    
    const response = await axios.post(url , query , {
      headers : {
        'Content-Type': 'text/plain'
      }
    });
    
    const hospitals = response.data.elements;

    const hospitalData = hospitals.map(hospital => ({
      name: hospital.tags.name || "No Name",
      latitude: hospital.lat,
      longitude: hospital.lon,
      address: `${hospital.tags['addr:street'] || ''}, ${hospital.tags['addr:city'] || ''}, ${hospital.tags['addr:postcode'] || ''}`.trim(),
      phone: hospital.tags['contact:phone'] || hospital.tags.phone || "Not Available"
    }));

    console.log(response.data);

    
    return res.status(200).json({
      success: "Fetched Successfully",
      //data : response.data,
      hospitalData
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      error: "Some Internal Server Error",
    });
  }
}

module.exports = {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
  UserMedicalInfo,
  getUserMedicalInfo,
  getNearbyHospitals,
};
