// accomplishments routes
// GET w/ optional params: user, start_date, end_date
// PUT w/ required params: id (null if new), user, date, text

const express = require("express");
const moment = require("moment");
const router = express.Router();
const Accomplishment = require("../models/accomplishment");
const User = require("../models/user");
const middleware = require("../middleware");
const log = require('simple-node-logger').createSimpleLogger();


function getDateRange(startDate, stopDate, type) {
  let dateArray = [];
  let currentDate = moment(startDate);
  stopDate = moment(stopDate);
  while (currentDate <= stopDate) {
    // only include weekdays for dashboard
    if (type === "user" || (currentDate.isoWeekday() !== 6 && currentDate.isoWeekday() !== 7)) {
      dateArray.push({
        date: moment(currentDate).format("YYYY-MM-DD"),
        text: type === "user" ? "" : false
      });
    }
    currentDate = moment(currentDate).add(1, "days");
  }

  return dateArray;
}

// get all accomplishments
router.get("/", middleware.checkToken, async (req, res) => {
  // build an array of dates that we need
  let dateRange = getDateRange(
    req.query.start_date,
    req.query.end_date,
    "user"
  );

  // build filter using optional query params that are provided in url
  let findFilter = {};
  if (req.query.user) {
    log.info(req.decoded.userEmail + '  GET /  user:' + req.query.user)
    findFilter.user = req.query.user;
  }
  if (req.query.start_date || req.query.end_date) findFilter.date = {};
  if (req.query.start_date)
    findFilter.date.$gte = new Date(req.query.start_date);
  if (req.query.end_date) findFilter.date.$lte = new Date(req.query.end_date);

  try {
    const accomplishments = await Accomplishment.find(findFilter);

    // make one-dimensional array of accomplishment dates to make filtering easier
    let accomplishmentDates = [];
    accomplishments.forEach((x, index) => {
      //accomplishments[index].date = 'a' + moment.utc(accomplishments[index].date).format("YYYY-MM-DD")
      accomplishmentDates.push(moment.utc(x.date).format("YYYY-MM-DD"));
    });

    // loop through all dates in range. if date is not in accomplishments, then add it.
    dateRange.forEach(x => {
      index = accomplishmentDates.indexOf(x.date);
      if (index === -1) {
        // add element to new array
        accomplishments.push(x);
      }
    });

    const sortedAccomplishments = accomplishments.sort(
      (a, b) =>
        new moment.utc(b.date).format("YYYYMMDD") -
        new moment.utc(a.date).format("YYYYMMDD")
    );

    res.json(sortedAccomplishments);
  } catch (err) {
    // 500: internal server error
    log.error(req.decoded.userEmail + '  ' + err.message)
    res.status(500).json({ message: err.message });
  }
});

// create or update one accomplishment
router.put("/", middleware.checkToken, async (req, res) => {
  let accomplishment;

  if (req.body.id != null) {
    // ID passed in, so update the existing object

    // get existing accomplishment from database
    try {
      log.info(req.decoded.userEmail + '  PUT /  accomplishment:' + req.body.id + '  UPDATING BY ID  text:' + req.body.text)
      accomplishment = await Accomplishment.findById(req.body.id);
      // 404: not found
      if (accomplishment === null) {
        log.error(req.decoded.userEmail + '  INVALID ID')
        return res.status(404).json({ message: "Cannot find accomplishment" });
      }
    } catch (err) {
      // 500: internal server error
      log.error(req.decoded.userEmail + '  ' + err.message)
      res.status(500).json({ message: err.message });
    }
    // update the text & lastUpdate of existing accomplishment object
    accomplishment.text = req.body.text;
    accomplishment.lastUpdate = Date.now();

    try {
      // save the updates to the database
      const updatedAccomplishment = await accomplishment.save();
      res.json(updatedAccomplishment);
    } catch (err) {
      // 400: something wrong w/ user's input
      log.error(req.decoded.userEmail + '  ' + err.message)
      res.status(400).json({ message: err.message });
    }

  } else {

    // check if accomplishment exists for this user on this date
    // (this should be unlikely, but does happen from time to time)
    accomplishment = await Accomplishment.findOne({user: req.body.user, date: req.body.date});
    if (accomplishment) {
      // update existing accomplishment
      accomplishment.text = req.body.text;
      accomplishment.lastUpdate = Date.now();
      try {
        // save the updates to the database
        log.info(req.decoded.userEmail + '  PUT /  accomplishment:null' + '  UPDATING BY DATE  date:' + req.body.date + '  text:' + req.body.text)
        const updatedAccomplishment = await accomplishment.save();
        res.json(updatedAccomplishment);
      } catch (err) {
        // 400: something wrong w/ user's input
        log.error(req.decoded.userEmail + '  ' + err.message)
        res.status(400).json({ message: err.message });
      }
    } else {
      // no id provided & cannot find accomplishment by date for
      // this user, so it must be new. let's created it in the db.
      log.info(req.decoded.userEmail + '  PUT /  accomplishment:null' + '  CREATING NEW  date:' + req.body.date + '  text:' + req.body.text)
      accomplishment = new Accomplishment({
        date: req.body.date,
        user: req.body.user,
        text: req.body.text
      });
      try {
        const newAccomplishment = await accomplishment.save();
        // 201: successfully created an object
        res.status(201).json(newAccomplishment);
      } catch (err) {
        // 400: something wrong w/ user's input
        log.error(req.decoded.userEmail + '  ' + err.message)
        res.status(400).json({ message: err.message });
      }
    }
  }
});

// don't require token for this since not much data is actually given
router.get("/dashboard", async (req, res) => {
  log.info('GET /dashboard')
  // build an array of dates that we need
  let dateRange = getDateRange(
    req.query.start_date,
    req.query.end_date,
    "dashboard"
  );

  // build filter using optional query params that are provided in url
  let findFilter = {};
  if (req.query.start_date || req.query.end_date) findFilter.date = {};
  if (req.query.start_date)
    findFilter.date.$gte = new Date(req.query.start_date);
  if (req.query.end_date) findFilter.date.$lte = new Date(req.query.end_date);

  // get all accomplishments from the date range
  const accomplishments = await Accomplishment.find(findFilter);

  // get list of all users
  try {
    const users = await User.find().sort({firstName: 1});

    let usersArr = [];

    // first add headers
    let userObj = {
      id: "headers",
      data: JSON.parse(JSON.stringify(dateRange))
    };
    usersArr.push(userObj);

    users.forEach(user => {
      let userObj = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        data: JSON.parse(JSON.stringify(dateRange))
      };

      usersArr.push(userObj);
    });

    // loop through each user
    await asyncForEach(usersArr, async (user, userIndex) => {
      if (user.id != "headers") {
        // loop through each day
        await asyncForEach(user.data, async (day, dayIndex) => {
          await asyncForEach(accomplishments, async (accomplishment) => {
            if (
              moment.utc(accomplishment.date).format('YYYY-MM-DD') === day.date
              && accomplishment.user.toString() == user.id.toString()
              && accomplishment.text.length > 2
            ) {
              usersArr[userIndex].data[dayIndex].text = true;
            }
          })
        });
      }
    });

    res.status(200).json(usersArr);
  } catch (err) {
    // 500: internal server error
    res.status(500).json({ message: err.message });
  }
});

// asyncForEach function from https://codeburst.io/javascript-async-await-with-foreach-b6ba62bbf404
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

module.exports = router;
