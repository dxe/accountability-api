// users routes

require("dotenv").config();
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const middleware = require("../middleware");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT);
let jwt = require("jsonwebtoken");

// get all users
router.get("/", middleware.checkToken, async (req, res) => {
  try {
    const users = await User.find().sort({firstName: 1});
    const currentUser = req.decoded.userId;
    const currentUserFirstName = req.decoded.firstName;
    res.json({
      currentUser: { id: currentUser, firstName: currentUserFirstName },
      users: users
    });

  } catch (err) {
    // 500: internal server error
    res.status(500).json({ message: err.message });
  }
});

// get one user
router.get("/:id", middleware.checkToken, getUser, (req, res) => {
  // just send full json object
  res.json(res.user);
});

// create one user
router.post("/", middleware.checkToken, async (req, res) => {
  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email
  });
  try {
    const newUser = await user.save();
    // 201: successfully created an object
    res.status(201).json(newUser);
  } catch (err) {
    // 400: something wrong w/ user's input
    res.status(400).json({ message: err.message });
  }
});

// update one user
router.patch("/:id", middleware.checkToken, getUser, async (req, res) => {
  // only update values that are sent in req body
  if (req.body.firstName != null) res.user.firstName = req.body.firstName;
  if (req.body.lastName != null) res.user.lastName = req.body.lastName;
  if (req.body.email != null) res.user.email = req.body.email;
  if (req.body.backgroundColor != null) res.user.backgroundColor = req.body.backgroundColor;
  if (req.body.lastLoginDate != null) res.user.lastLoginDate = req.body.lastLoginDate;

  try {
    // save the updates to the database
    const updatedUser = await res.user.save();
    res.status(200).json(updatedUser);
  } catch (err) {
    // 400: something wrong w/ user's input
    res.status(400).json({ message: err.message });
  }
});

// delete one user
router.delete("/:id", middleware.checkToken, getUser, async (req, res) => {
  try {
    await res.user.remove();
    res.json({ message: "Deleted user" });
  } catch (err) {
    // 500: internal server error
    res.status(500).json({ message: err.message });
  }
});

// process auth request
router.post("/auth", async (req, res) => {
  if (!req.body.token)
    return res.status(400).json({ message: "token not supplied" });

  // validate the token & get user's email from google
  userEmail = await validateGoogleTokenAndReturnEmail(req.body.token);

  if (!userEmail)
    return res.status(401).json({ message: "oauth token invalid" });

  // check if user's email exists in database
  const user = await User.findOne({ email: userEmail });
  if (!user) {
    return res.status(401).json({ message: "user not authorized" });
  }

  // set lastLoginDate in database
  user.lastLoginDate = Date.now();
  await user.save();

  // create our own token that contains the user's id + email w/ a 1 week expiration
  let token = jwt.sign(
    { userId: user._id, firstName: user.firstName, userEmail: userEmail },
    process.env.SECRET,
    {
      expiresIn: "168h" // expires in 7 days
    }
  );

  // return token to client
  res.status(200).json({ token: token, backgroundColor: user.backgroundColor });
});

// validate google oauth token - https://developers.google.com/identity/sign-in/web/backend-auth#verify-the-integrity-of-the-id-token
async function validateGoogleTokenAndReturnEmail(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_OAUTH_CLIENT
    });
    const payload = ticket.getPayload();
    return payload.email;
  } catch (err) {
    return;
  }
}

// middleware function to get a user
async function getUser(req, res, next) {
  let user;
  try {
    user = await User.findById(req.params.id);
    // 404: not found
    if (user === null)
      return res.status(404).json({ message: "Cannot find user" });
  } catch (err) {
    // 500: internal server error
    res.status(500).json({ message: err.message });
  }

  res.user = user;
  next();
}

module.exports = router;
