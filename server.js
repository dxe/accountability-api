require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

// only run alerts service on "instance 0" when in prod
if (process.env.SEND_ALERTS === "enabled") {
	const alerts = require("./services/alerts");
	console.log("Alerts enabled.")
}

const db = mongoose.connection;
const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    auto_reconnect: true,
}
db.on('connecting', function() {
    console.log('connecting to MongoDB...');
});
db.on('error', function(error) {
    console.error('Error in MongoDb connection: ' + error);
    mongoose.disconnect();
});
db.on('connected', function() {
    console.log('MongoDB connected!');
});
db.once('open', function() {
    console.log('MongoDB connection opened!');
});
db.on('reconnected', function () {
    console.log('MongoDB reconnected!');
});
db.on('disconnected', function() {
    console.log('MongoDB disconnected!');
    mongoose.connect(process.env.DATABASE_URL, mongooseOptions);
});
mongoose.connect(process.env.DATABASE_URL, mongooseOptions);

app.use(express.json());
app.use(
  cors()
);

app.get("/healthz", (req, res) => {
    res.status(200).send("OK")
})

const usersRouter = require("./routes/users");
app.use("/users", usersRouter);

const accomplishmentsRouter = require("./routes/accomplishments");
app.use("/accomplishments", accomplishmentsRouter);

app.listen(process.env.PORT, () => console.log(`Server started: ${process.env.NODE_ENV} instance ${process.env.NODE_APP_INSTANCE}.`));