// for reading in JSON files
const fs = require("fs");

// JS library used to get locale-aware time
const moment = require("moment-timezone");

// variable for bus object
let HopperBusTimes;

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
						return `The ${busRouteName} starts from ${formattedBusStopName} at ${moment(HopperBusTimes[busRouteName][dayOfWeek][busStopName]["start_time"], "hmm").format("HH:mm")}`;
					case "end":
						return `The last ${busRouteName} will stop at ${formattedBusStopName} at ${moment(HopperBusTimes[busRouteName][dayOfWeek][busStopName]["end_time"], "hmm").format("HH:mm")}`;
					case undefined:
						let busStopStartTime = moment(HopperBusTimes[busRouteName][dayOfWeek][busStopName]["start_time"], "hmm");
						let busStopEndTime = moment(HopperBusTimes[busRouteName][dayOfWeek][busStopName]["end_time"], "hmm");

						// checking whether the buses are running
						// noinspection Annotator
						if (currentTime.isBefore(busStopStartTime)) {
							return `The ${busRouteName} is not running yet. The first bus departs from ${formattedBusStopName} at ${busStopStartTime.format("HH:mm") + "."}`;
						} else {
							if (currentTime.isAfter(busStopEndTime)) {
								return `The final ${busRouteName} bus departed from ${formattedBusStopName} at ${busStopEndTime.format("HH:mm")}.\n` +
									`The first bus from  ${formattedBusStopName} will depart at ${busStopStartTime.format("HH:mm")} tomorrow.`;
							} else {
								let responseString = `The next ${busRouteName} bus leaves ${formattedBusStopName} at `;

								// getting the minutes past each hour at which the bus stops at a particular bus stop
								let minutesPastArray = HopperBusTimes[busRouteName][dayOfWeek][busStopName]["minutes_past"];

								// determining which next time to return
								for (let i = 0; i < minutesPastArray.length; i++) {
									if (currentTime.minutes() < minutesPastArray[i]) {
										return minutesPastArray[i] >= 10 ? responseString += `${currentTime.hours()}:${minutesPastArray[i]}.` : responseString += `${currentTime.hours()}:0${minutesPastArray[i]}.`;
									} else if (i === minutesPastArray.length - 1) {
										return minutesPastArray[0] >= 10 ? responseString += `${currentTime.hours() + 1}:${minutesPastArray[0]}` : responseString += `${currentTime.hours() + 1}:0${minutesPastArray[0]}.`;
									} // end if/else
								} // end for
							}
						} // end if/else
				} // end switch
			} else {
				return `The ${busRouteName} does not stop at ${formattedBusStopName}.\nIf you would like to see a list of all bus stops on a certain line type 'Get all [bus route] stops'.`;
			} // end if/else
		} else {
			return `The ${busRouteName} does not run today.`;
		}// end if/else
	}, // end get next bus time

	getAllBusStopsOnLine: (busRouteName) => {
		// getting a locale aware time object
		let currentTime = moment().tz("Europe/London");

		// for accessing the right day's bus schedule
		let dayOfWeek = getWeekDay(currentTime);

		let toReturn = `The ${busRouteName} stops at `;

		// building a sentence to return to the user
		let busStops = Object.keys(HopperBusTimes[busRouteName][dayOfWeek]).forEach((value, index, array) => {
			// formatting the bus stop name
			let formattedBusStopName = toTitleCase(value);

			// adding it to the return sentence
			index < array.length - 1 ? toReturn += `${formattedBusStopName}, ` : toReturn += `and ${formattedBusStopName} `;
		});

		// if it's saturday or sunday then the word should be capitalised
		if (dayOfWeek !== "weekday") dayOfWeek = toTitleCase(dayOfWeek);

		toReturn += `on ${dayOfWeek}s.`;

		return toReturn;
	} // end getAllBusStopsOnLine
}; // end BusTimes

// exporting BusTimes as module
module.exports = BusTimes;