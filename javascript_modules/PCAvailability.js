const fs = require("fs");
const request = require("request");
const cheerio = require("cheerio");
const Cookies = require("cookies");

// global variable to hold the results of multiple asynchronous requests
let asyncCallResultsArray = [];

// holds arrays for each type of request the user can make
let PCLocationObject;

// function for requesting individual web-pages and extracting the useful information
const makeSingleRequestAsPromise = (building, url) => {
	return new Promise((resolve, reject) => {
		request({uri: url}, (error, response, body) => {
			// error checking
			if (error) reject(error);

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

			// resolving method so that the results can be processed
			resolve(responseArray);
		});
	});
};

// utility function to calculate straight line distance between two points in KM
const calcDist = (lat1, lon1, lat2, lon2) => {
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
	initialise: () => {
		fs.readFile('./res/json/PCAvailability.json', (err, data) => {
			if (err) throw err;
			PCLocationObject = JSON.parse(data);
		});
	},
	getAvailablePCs: (location, serverResponse) => {
		// extracting the right link from the PCLocationObject object
		let input = PCLocationObject[location]["links"];

		// looping over all the urls found in the object
		input.forEach((currentElement) => {
			// making each request individually as a promise
			makeSingleRequestAsPromise(location, currentElement).then((result) => {
				let responseString = "";

				// concatenating results of one web-page into a single response string
				result.forEach(currentElement => responseString += `${currentElement[location]["location"]} has ${currentElement[location]["free"]} available PCs. `);

				// adding the completed response string to an array which stores them all
				asyncCallResultsArray.push(responseString.trim());

				// checking whether all calls have returned (there will be as many responses as there were links passed into the method)
				if (asyncCallResultsArray.length === input.length) {
					// adding more information the beginning of the array
					asyncCallResultsArray.unshift("Information for " + PCLocationObject[location]["locationName"] + ":");

					// turning the results into a single string to send back to the user
					let response = asyncCallResultsArray.join('\n').trim();

					// clearing results for the array's next use
					asyncCallResultsArray = [];

					// sending the response back to the user
					serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
					serverResponse.end(response);
				} // end if
			});
		});
	},
	confirmLocationRequest: (serverRequest, serverResponse) => {
		// setting a cookie so the browser knows to ask for the location
		let cookies = new Cookies(serverRequest, serverResponse);
		cookies.set("requestLocation", true, {httpOnly: false});

		// sending the module's instructional text to the user
		serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
		serverResponse.end("Your GPS location is required in order to find the nearest available PC to you.\n" +
			"Once you accept the location request, your neearest PC will be displayed after a few seconds.");
	},
	getNearestPC: (latLong, serverRequest, serverResponse) => {
		// storing user's coordinates
		let userLatitude = latLong.split(",")[0];
		let userLongitude = latLong.split(",")[1];

		// comparison object
		let closestPC = {
			distance: 10000,
			location: ""
		};

		// calculating the shortest distance out of all computer locations
		Object.keys(PCLocationObject).forEach((location) => {
			if (PCLocationObject[location]["coordinates"] !== undefined) {
				let distance = calcDist(userLatitude, userLongitude, PCLocationObject[location]["coordinates"][0], PCLocationObject[location]["coordinates"][1]);

				// storing value of shortest distance and its location
				if (distance <= closestPC.distance) {
					closestPC.distance = distance;
					closestPC.location = location;
				} // end if
			}
		});

		// deleting the cookie which indicates a requiered call to this method
		let cookies = new Cookies(serverRequest, serverResponse);
		cookies.set("findNearestPC", "", {expires: new Date(0)});

		// calling the next method with the location of the closest computer room
		PCAvailability.getAvailablePCs(closestPC.location, serverResponse);
	}
};

// exporting the above object
module.exports = PCAvailability;