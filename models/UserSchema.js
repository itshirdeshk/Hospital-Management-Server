const mongoose = require("mongoose");


const addressSchema = new mongoose.Schema({
  line: {
    type: [String],  // Array of strings for the address line(s)
    required: true,  // You can make it required if necessary
  },
  city: {
    type: String,
    required: true,  // You can make it required if necessary
  },
  state: {
    type: String,
    required: true,  // You can make it required if necessary
  },
  postalCode: {
    type: String,
    required: true,  // You can make it required if necessary
  },
  country: {
    type: String,
    required: true,  // You can make it required if necessary
  }
}, { _id: false });


const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique : true,
  },
  password: {
    type: String,
    required: true,
  },
  mobile_number: {
    type: String,
    required: true,
  },
  address: {
    type: [addressSchema],
    required: true,
  },
  dob: {
    type: Date,
    required: true,
  },
  gender: {
    type: String,
    required: true,
  },
  blood_group: {
    type: String,
    required: true,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
});


const userFHIRSchema = new mongoose.Schema({
  UserId : {
    type : String,
  },
  FHIR_id : {
    type : String,
  }
})


const User = mongoose.model("User", userSchema);
const UserFHIR = mongoose.model("UserFHIR", userFHIRSchema);

module.exports = {User , UserFHIR};
