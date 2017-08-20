// for reading in JSON files
const fs = require("fs");

// JS library used to get locale-aware time
const moment = require("moment-timezone");

// variable for bus object
let HopperBusTimes;

// variable for the bot's identity string
let identityString = "UoN-Bot:";

// convenience method to get the current weekday
const getWeekDay = currentTime => {
	let toReturn;

	// deciding which object to access based on current day in week
	switch (currentTime.weekday()) {
		case 6:
			toReturn = "saturday";
			break;
		case 7:
			toReturn = "sunday";
			break;
		default:
			toReturn = "weekday";
			break;
	} // end switch

	return toReturn;
};

// convenience method to return a title-case bus stop name
const toTitleCase = value => String(value).split(" ").map(word => word[0].toUpperCase() + word.substr(1).toLowerCase()).join(" ");

const BusTimes = {
	// function to load in bus JSON files
	initialise: () => {
		// reading JSON files into respective bus objects
		fs.readFile("./res/json/HopperBusTimes.json", (err, data) => {
			if (err) throw err;
			HopperBusTimes = JSON.parse(data);
		});
	}, // end initialise function

	// function to request the next bus time from any route/stop that exists
	getNextBusTime: (startEnd, busRouteName, busStopName) => {
		// formatting and storing bus stop name as separate variable for user readability
		let formattedBusStopName = toTitleCase(busStopName);

		// getting a locale aware time object
		let currentTime = moment().tz("Europe/London");

		// for accessing the right day's bus schedule
		let dayOfWeek = getWeekDay(currentTime);

		// checking whether the bus runs on the current day
		if (HopperBusTimes[busRouteName][dayOfWeek] !== undefined) {
			// checking that the stop exists on this bus route
			if (HopperBusTimes[busRouteName][dayOfWeek][busStopName] !== undefined) {
				// switching on possible operations this method can perform
				switch (startEnd) {
					case "start":
						return `<p>${identityString} The first <strong>${busRouteName}</strong> stops at <strong>${formattedBusStopName}</strong> at <strong>${moment(HopperBusTimes[busRouteName][dayOfWeek][busStopName]["start_time"], "hmm").format("HH:mm")}</strong></p>`;
					case "end":
						return `<p>${identityString} The last <strong>${busRouteName}</strong> will stop at <strong>${formattedBusStopName}</strong> at <strong>${moment(HopperBusTimes[busRouteName][dayOfWeek][busStopName]["end_time"], "hmm").format("HH:mm")}</strong></p>`;
					case undefined:
						let busStopStartTime = moment(HopperBusTimes[busRouteName][dayOfWeek][busStopName]["start_time"], "hmm");
						let busStopEndTime = moment(HopperBusTimes[busRouteName][dayOfWeek][busStopName]["end_time"], "hmm");

						// checking whether the buses are running
						// noinspection Annotator
						if (currentTime.isBefore(busStopStartTime)) {
							return `<p>${identityString} The <strong>${busRouteName}</strong> is not running yet. The first bus departs from <strong>${formattedBusStopName}</strong> at <strong>${busStopStartTime.format("HH:mm") + "."}</strong></p>`;
						} else {
							if (currentTime.isAfter(busStopEndTime)) {
								return `<p>${identityString} The final <strong>${busRouteName}</strong> bus departed from <strong>${formattedBusStopName}</strong> at <strong>${busStopEndTime.format("HH:mm")}.</strong></p\n>` +
									`<p>${identityString} The first bus from  <strong>${formattedBusStopName}</strong> will depart at <strong>${busStopStartTime.format("HH:mm")}</strong> tomorrow.</p>`;
							} else {
								// </p> tag is added in the return statements below
								let responseString = `<p>${identityString} The next <strong>${busRouteName}</strong> bus leaves <strong>${formattedBusStopName}</strong> at `;

								// getting the minutes past each hour at which the bus stops at a particular bus stop
								let minutesPastArray = HopperBusTimes[busRouteName][dayOfWeek][busStopName]["minutes_past"];

								// determining which next time to return
								for (let i = 0; i < minutesPastArray.length; i++) {
									if (currentTime.minutes() < minutesPastArray[i]) {
										return minutesPastArray[i] >= 10 ? responseString += `<strong>${currentTime.hours()}:${minutesPastArray[i]}.</strong></p>` : responseString += `<strong>${currentTime.hours()}:0${minutesPastArray[i]}</strong>.</p>`;
									} else if (i === minutesPastArray.length - 1) {
										return minutesPastArray[0] >= 10 ? responseString += `<strong>${currentTime.hours() + 1}:${minutesPastArray[0]}</strong></p>` : responseString += `<strong>${currentTime.hours() + 1}:0${minutesPastArray[0]}</strong>.</p>`;
									} // end if/else
								} // end for
							}
						} // end if/else
				} // end switch
			} else {
				return `<p>${identityString} The <strong>${busRouteName}</strong> does not stop at <strong>${formattedBusStopName}</strong>.\nIf you would like to see a list of all bus stops on a certain line type 'Get all [bus route] stops'.</p>`;
			} // end if/else
		} else {
			return `<p>${identityString} The <strong>${busRouteName}</strong> does not run today.</p>`;
		}// end if/else
	}, // end get next bus time

	getAllBusStopsOnLine: (busRouteName) => {
		// getting a locale aware time object
		let currentTime = moment().tz("Europe/London");

		// for accessing the right day's bus schedule
		let dayOfWeek = getWeekDay(currentTime);

		let toReturn = `<p>The <strong>${busRouteName}</strong> stops at `;

		// building a sentence to return to the user
		let busStops = Object.keys(HopperBusTimes[busRouteName][dayOfWeek]).forEach((value, index, array) => {
			// formatting the bus stop name
			let formattedBusStopName = toTitleCase(value);

			// adding it to the return sentence
			index < array.length - 1 ? toReturn += `${formattedBusStopName}, ` : toReturn += `and ${formattedBusStopName} `;
		});

		// if it's saturday or sunday then the word should be capitalised
		if (dayOfWeek !== "weekday") dayOfWeek = toTitleCase(dayOfWeek);

		toReturn += `on <strong>${dayOfWeek}s</strong>.</p>`;

		// console.log(toReturn);

		return toReturn;
	} // end getAllBusStopsOnLine
}; // end BusTimes

// exporting BusTimes as module
module.exports = BusTimes;