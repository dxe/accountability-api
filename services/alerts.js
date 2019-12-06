require("dotenv").config();
const schedule = require('node-schedule');
const moment = require("moment");
const twilio = require('twilio');
const Accomplishment = require("../models/accomplishment");
const User = require("../models/user");
const logOptions = {
        logDirectory:process.env.LOG_DIR, // NOTE: folder must exist and be writable...
        fileNamePattern:'alerts-<DATE>.log',
        dateFormat:'YYYY.MM.DD',
        timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS',
};
const log = require('simple-node-logger').createRollingFileLogger( logOptions );

// TODO: move to .env
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const smsClient = new twilio(accountSid, authToken);

// run job every minute
let job = schedule.scheduleJob('*/1 * * * *', async function(){

	log.info('Running job.');

	// only run on weekdays
	const weekendDays = [6, 7];
	const currentDay = moment(Date.now()).isoWeekday();
	if (weekendDays.includes(currentDay)) {
		log.info("It's the weekend.");
		return
	}

	const currentDate = moment(Date.now()).format('YYYY-MM-DD');
	const currentTime = moment(Date.now()).format('HH:mm');

	// lookup users who have alerts enabled whose alert time is now
	const users = await User.find({alert: true, alertTime: currentTime}).sort({firstName: 1});

	users.forEach(async user => {

		log.info(`Checking if message should be sent to ${user.firstName} ${user.lastName}.`);

		accomplishment = await Accomplishment.findOne({user: user.id, date: currentDate});

		if (!accomplishment || accomplishment.text.length < 3) {
			log.info(`Sending message to ${user.firstName} ${user.lastName}!`);
			// send message
			smsClient.messages.create({
			    body: "You haven't filled out your accountability sheet! accountability.dxe.io",
			    messagingServiceSid: process.env.TWILIO_SERVICE,
			    to: user.phone
			})
			.then((message) => log.info(`Message sent to ${user.firstName} ${user.lastName}.`))
			.catch((err) => log.error(`Error sending message to ${user.firstName} ${user.lastName}. ${err}`));
		}  else {
			log.info(`No message required for ${user.firstName} ${user.lastName}.`);
		}

	});

});