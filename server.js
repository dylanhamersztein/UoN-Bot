// for creating the server
const http = require("http");

// for manipulating cookies
const Cookies = require("cookies");

// for reading the web-page files
const fs = require("fs");

// for interpreting user input
const AIMLInterpreter = require("./node_modules/aimlinterpreter/AIMLInterpreter");

// for facilitating progression calculation
const ModuleProgression = require("./javascript_modules/ModuleProgression");
const DegreeProgression = require("./javascript_modules/DegreeProgression");
DegreeProgression.initialise();

// for getting bus times at user's request
const BusTimes = require("./javascript_modules/BusTimes");
BusTimes.initialise();

// for performing staff look-ups
const StaffSearch = require("./javascript_modules/StaffSearch");

// for getting business hours of shops
const ShopTimes = require("./javascript_modules/ShopTimes");
ShopTimes.initialise();

// for getting available pcs on campus
const PCAvailability = require("./javascript_modules/PCAvailability");
PCAvailability.initialise();

// requiring and starting the web crawl
const WebCrawler = require("./javascript_modules/WebCrawler");

fs.readdir("./res/compsciwebsite", (err, files) => {
	// only crawling if it hasn't happened yet
	if (files.length < 1) {
		WebCrawler.startCrawlAt("https://www.nottingham.ac.uk/ComputerScience/index.aspx");
	} else {
		console.log("Files already indexed. Ready to search.")
	}// end if
});

// for searching through the computer science web-pages
const SearchEngine = require("./javascript_modules/SearchEngine");

// initialising the AIML interpreter and loading files into it
let aimlInterpreter = new AIMLInterpreter({name: "UoN-Bot", age: "100"});
aimlInterpreter.loadAIMLFilesIntoArray([
	"./bot_brain/brain.aiml"
]);

// server listening port
const port = 9000;

// temporarily holds POST request data
let queryData = "";

// variables for web-page files
let index, script, style;

let identityString = "UoN-Bot:";

fs.readFile("./res/website/index.html", (err, data) => {
	if (err) throw err;
	index = data;
});

fs.readFile("./res/website/style.css", (err, data) => {
	if (err) throw err;
	style = data;
});

fs.readFile("./res/website/script.js", (err, data) => {
	if (err) throw err;
	script = data;
});

// defining server behaviour
const server = (request, response) => {
	if (request.method === "GET") {
		// switching on subdirectory to determine which file to return
		switch (request.url) {
			case "/style.css":
				response.writeHead(200, {"Content-Type": "text/css"});
				response.end(style);
				break;
			case "/script.js":
				response.writeHead(200, {"Content-Type": "application/javascript"});
				response.end(script);
				break;
			default:
				response.writeHead(200, {"Content-Type": "text/html"});
				response.end(index);
				break;
		} // end switch
	} else if (request.method === "POST") {
		// defining error behaviour for request
		request.on("error", err => console.log("Error: " + err));

		// defining data received behaviour for request
		request.on("data", data => {
			queryData += data;

			// checking if there is too much post data
			if (queryData.length > 1e6) {
				queryData = "";
				request.connection.destroy();
			} // end if
		});

		// defining what do to when all data is received
		request.on("end", () => {
			// creating cookies instance
			let cookies = new Cookies(request, response);

			// ROUTING LOGIC
			if (queryData === ModuleProgression.userCommand && cookies.get(ModuleProgression.cookieName) === undefined) {
				// retrieving the instructional text
				ModuleProgression.getInstructionText(request, response);
			} else if (cookies.get(ModuleProgression.cookieName) !== undefined) {
				// calculating module progression
				ModuleProgression.calculateProgression(queryData, request, response);
			} else if (queryData === DegreeProgression.userCommand && cookies.get(DegreeProgression.cookieName) === undefined) {
				// sending the first question to the user
				DegreeProgression.getFirstQuestion(request, response);
			} else if (cookies.get(DegreeProgression.cookieName) !== undefined) {
				// getting the next question and returning it to the user
				DegreeProgression.getNextQuestion(queryData, request, response);
			} else if (cookies.get(StaffSearch.moduleCookieName) === "multipleResults") {
				// clarifying which member of staff the user meant
				StaffSearch.handleMultipleResults(queryData, request, response);
			} else if (cookies.get(PCAvailability.nearestPCCookieName) !== undefined) {
				// finding nearest PC to user
				PCAvailability.getNearestPC(queryData, request, response);
			} else if (cookies.get(SearchEngine.moduleCookieName) !== undefined) {
				// checking if the user wants to see the next page or not
				SearchEngine.getNextPage(queryData, request, response);
			} else {
				// finding response for user's input from AIML file
				aimlInterpreter.findAnswerInLoadedAIMLFiles(queryData, (answer, wildCardArray, input) => {
					// logging by default to see what's being searched for
					console.log(`${input} | ${answer}`);

					if (answer === undefined) {
						response.writeHead(200, {"Content-Type": "text/plain"});
						response.end("Sorry, I didn't quite understand what you were saying there.");
					} else if (answer.substring(0, 6) === "SCRIPT") {
						// extracting and evaluating the code from its identifier in brain.aiml
						let evalResult = eval(answer.split(":")[1]);

						// if evalResult is undefined then the server response was sent from inside an asynchronous method
						if (evalResult !== undefined) {
							response.writeHead(200, {"Content-Type": "text/plain"});
							response.end(evalResult);
						} // end if
					} else {
						response.writeHead(200, {"Content-Type": "text/plain"});
						response.end(`<p>${identityString} ${answer}</p>`);
					} // end if/else
				});
			} // end if block

			// clearing queryData for its next use
			queryData = "";
		});
	} // end if/else
};

// listening on several ports
http.createServer(server).listen(port);