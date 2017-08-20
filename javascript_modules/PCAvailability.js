// for reading in JSON file
const fs = require("fs");

// for making requests to the PCFinder website
const request = require("request");

// for extracting information from the returned web-page
const cheerio = require("cheerio");

// for manipulating cookies
const Cookies = require("cookies");

// global variable to hold the results of multiple asynchronous requests
let asyncCallResultsArray = [];

// holds arrays for each type of request the user can make
let PCLocationObject;

let identityString = "UoN-Bot:";

const getAvailabilityInformation = async (building, url, callback) => {
	request({url: url}, (error, response, body) => {
		// error checking
		if (error) throw error;

		// declaring array to hold extracted information
		let responseArray = [];

		// loading response into searchable object
		const $ = cheerio.load(body);

		// getting the table generated by pcfinder into an object
		let tableRows = $("tbody").find("tr").children();

		// iterating over every row in the table
		for (let i = 0; i < tableRows.length; i += 4) {
			let location = tableRows[String(i)].children[0].data.split(",")[0].trim();
			if (location !== "TOTAL") {
				let free = tableRows[String(i + 1)].children[0].data;
				let inUse = tableRows[String(i + 2)].children[0].data;
				responseArray.push({[building]: {"location": location, "free": free, "inUse": inUse}});
			} // end if
		} // end for

		// executing the callback on the results once they're compiled
		callback(responseArray);
	});
};

// utility function to calculate straight line distance between two points
const distanceBetween = (lat1, lon1, lat2, lon2) => {
	let radlat1 = Math.PI * lat1 / 180;
	let radlat2 = Math.PI * lat2 / 180;
	let theta = lon1 - lon2;
	let radtheta = Math.PI * theta / 180;
	let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist);
	dist = dist * 180 / Math.PI;
	dist = dist * 60 * 1.1515;
	return dist;
};

// module to export
const PCAvailability = {
	nearestPCCookieName: "findNearestPC",

	initialise: () => {
		fs.readFile("./res/json/PCAvailability.json", (err, data) => {
			if (err) throw err;
			PCLocationObject = JSON.parse(data);
		});
	}, // end initialise

	getAvailablePCs: (pcLocation, serverResponse) => {
		// extracting the right link from the PCLocationObject object
		let pcFinderLinks = PCLocationObject[pcLocation]["links"];

		// looping over all the urls found in the object
		pcFinderLinks.forEach((currentElement) => {
			// making each request individually
			getAvailabilityInformation(pcLocation, currentElement, result => {
				// defing a string in which to store the response surrounded by HTML paragraph tags
				let responseString = `<p>`;

				// concatenating results of one web-page into a single response string
				result.forEach(building => responseString += `${building[pcLocation]["location"]} has ${building[pcLocation]["free"]} available PCs.<br />`);

				// closing the HTML paragraph tag
				responseString += `</p>`;

				// adding the completed response string to an array which stores them all
				asyncCallResultsArray.push(responseString.trim());

				// checking whether all calls have returned (there will be as many responses as there were links passed into the method)
				if (asyncCallResultsArray.length === pcFinderLinks.length) {
					// adding more information the beginning of the array
					asyncCallResultsArray.unshift(`<p>${identityString} Information for <strong>${PCLocationObject[pcLocation]["locationName"]}:</strong></p>`);

					// turning the results into a single string to send back to the user
					let response = asyncCallResultsArray.join("\n").trim();

					// clearing results for the array's next use
					asyncCallResultsArray = [];

					// sending the response back to the user
					serverResponse.writeHead(200, {"Content-Type": "text/plain"});
					serverResponse.end(response);
				} // end if
			});
		});
	}, // end getAvailablePCs

	confirmLocationRequest: (serverRequest, serverResponse) => {
		// setting a cookie so the browser knows to ask for the location
		let cookies = new Cookies(serverRequest, serverResponse);
		cookies.set("requestLocation", true, {httpOnly: false});

		// sending the module's instructional text to the user
		serverResponse.writeHead(200, {"Content-Type": "text/plain"});
		serverResponse.end("<p>Your GPS location is required in order to find the nearest available PC to you.</p>\n" +
			"<p>Once you accept the location request, your nearest PC will be displayed after a few seconds.</p>");
	}, // end confirmLocationRequest

	getNearestPC: (latLong, serverRequest, serverResponse) => {
		let index = -1;

		// extracting user's coordinates
		let userLatitude = latLong.split(",")[0];
		let userLongitude = latLong.split(",")[1];

		// sorting pc locations in ascending distance order
		let distanceSortedLocations = Object.keys(PCLocationObject).sort((a, b) => {
			if (PCLocationObject[a]["coordinates"] !== undefined && PCLocationObject[b]["coordinates"] !== undefined) {
				return distanceBetween(userLatitude, userLongitude, PCLocationObject[a]["coordinates"][0], PCLocationObject[a]["coordinates"][1]) - distanceBetween(userLatitude, userLongitude, PCLocationObject[b]["coordinates"][0], PCLocationObject[b]["coordinates"][1])
			} // end if
		});

		// removing entries which don't have coordinates
		distanceSortedLocations.forEach((location, index, array) => {
			if (location === "hallwardL1" || location === "hallwardL2" || location === "hallwardL3" || location === "hallwardL4") {
				array.splice(index, 1);
			} // end if
		});

		// defining a method to make additional requests until it finds a location with >0 available PCs
		const checkAvailabilityRecursively = async () => {
			if (index < distanceSortedLocations.length) {
				// indicating the next location
				index++;

				// making a request and checking how many pcs are available before deciding whether to return or recurse
				await getAvailabilityInformation(distanceSortedLocations[index], PCLocationObject[distanceSortedLocations[index]]["links"][0], results => results.forEach(value => {
					if (value[distanceSortedLocations[index]]["free"] > 0) {
						// deleting the cookie which indicates a required call to this method
						let cookies = new Cookies(serverRequest, serverResponse);
						cookies.set("findNearestPC", "", {expires: new Date(0)});

						// sending the response back to the user
						serverResponse.writeHead(200, {"Content-Type": "text/plain"});
						serverResponse.end(`<p><strong>${PCLocationObject[distanceSortedLocations[index]]["locationName"]}</strong> is your nearest location and has <strong>${results[0][distanceSortedLocations[index]]["free"]}</strong> available PCs in <strong>${results[0][distanceSortedLocations[index]]["location"]}</strong>.</p>`);
					} else {
						// recursing to the next location
						checkAvailabilityRecursively();
					} // end if/else
				}));
			} else {
				// deleting the cookie which indicates a required call to this method
				let cookies = new Cookies(serverRequest, serverResponse);
				cookies.set("findNearestPC", "", {expires: new Date(0)});

				// indicating to the user that the method has not found a location with >0 available PCs
				serverResponse.writeHead(200, {"Content-Type": "text/plain"});
				serverResponse.end(`<p>Unfortunately there are no available PCs on campus at this time. Please try again later.</p>`);
			}// end if/else
		}; // end checkAvailabilityRecursively function

		// executing the method
		checkAvailabilityRecursively();
	} // end getNearestPC
};

// exporting the above object
module.exports = PCAvailability;