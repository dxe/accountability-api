require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

const alerts = require("./services/alerts");

mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
});
const db = mongoose.connection;
db.on("error", err => console.error(err));
db.once("open", () => console.log("Connected to database"));

app.use(express.json());
app.use(
  cors()
);

const usersRouter = require("./routes/users");
app.use("/users", usersRouter);

const accomplishmentsRouter = require("./routes/accomplishments");
app.use("/accomplishments", accomplishmentsRouter);

app.listen(process.env.PORT, () => console.log("Server started"));