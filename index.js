const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const userRouter = require("./routes/userRoutes.js");

const port = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

app.use("/api/user", userRouter);

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "HeathCare_Mangament",
  })
  .then(() => {
    console.log("Connected to database!");
  })
  .catch((err) => {
    console.log("Some error occured while connecting to database:", err);
  });

app.listen(port, () => {
  console.log(`App listening on Port ${port}`);
});
