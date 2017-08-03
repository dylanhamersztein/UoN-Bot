// for creating the server
const http = require("http");

// for dealing with cookies
const Cookies = require("cookies");

// for reading in the web-page files
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
WebCrawler.initialiseWebCrawler("https://www.nottingham.ac.uk/ComputerScience/index.aspx");

// for searching through the computer science web-pages
const SearchEngine = require("./javascript_modules/SearchEngine");

// server listening port
const port = 9000;

// temporarily holds POST request data
let queryData = "";

// variables for web-page files
let index, script, style;

fs.readFile('./res/website/index.html', (err, data) => {
    if (err) throw err;
    index = data;
});

fs.readFile('./res/website/style.css', (err, data) => {
    if (err) throw err;
    style = data;
});

fs.readFile('./res/website/script.js', (err, data) => {
    if (err) throw err;
    script = data;
});

// initialising the AIML intepreter and loading files into it
let aimlInterpreter = new AIMLInterpreter({name: 'UoN-Bot', age: '100'});
aimlInterpreter.loadAIMLFilesIntoArray(['./bot_brain/brain.aiml']);

// defining server behaviour
const server = (request, response) => {
    if (request.method === "GET") {
        // switching on subdirectory to determine which file to return
        switch (request.url) {
            case "/style.css":
                response.writeHead(200, {'Content-Type': 'text/css'});
                response.end(style);
                break;
            case "/script.js":
                response.writeHead(200, {'Content-Type': 'application/javascript'});
                response.end(script);
                break;
            default:
                response.writeHead(200, {'Content-Type': 'text/html'});
                response.end(index);
                break;
        } // end switch
    } else if (request.method === "POST") {
        // defining error behaviour for request
        request.on('error', (err) => {
            console.log("Error: " + err);
        });

        // defining data received behaviour for request
        request.on('data', (data) => {
            queryData += data;

            // checking if there is too much post data
            if (queryData.length > 1e6) {
                queryData = "";
                request.connection.destroy();
            } // end if
        });

        // defining what do to when all data is received
        request.on('end', () => {
            // creating cookies instance
            let cookies = new Cookies(request, response);

            // ROUTING LOGIC
            if (queryData === ModuleProgression.userCommand && cookies.get(ModuleProgression.cookieName) === undefined) {
                // setting a cookie for their next input
                cookies.set(ModuleProgression.cookieName, true, {httpOnly: false});

                // sending the module's instructional text to the user
                response.writeHead(200, {'Content-Type': 'text/plain'});
                response.end(ModuleProgression.instructionText);
            } else if (cookies.get(ModuleProgression.cookieName) !== undefined) {
                // deleting the relevant cookie
                cookies.set(ModuleProgression.cookieName, "", {"expires": new Date(0)});

                // calculating and sending user's progression back to client
                response.writeHead(200, {'Content-Type': 'text/plain'});
                response.end(ModuleProgression.calculateProgression(queryData));
            } else if (queryData === DegreeProgression.userCommand && cookies.get(DegreeProgression.cookieName) === undefined) {
                // sending the first question to the user
                DegreeProgression.getFirstQuestion(request, response);
            } else if (cookies.get(DegreeProgression.cookieName) !== undefined) {
                // getting the next question and returning it to the user
                DegreeProgression.getNextQuestion(queryData, request, response);
            } else if (cookies.get(StaffSearch.cookieName) === "multipleResults") {
                // clarifying which member of staff the user meant
                StaffSearch.handleMultipleResults(queryData, request, response);
            } else if (cookies.get("findNearestPC") !== undefined) {
                // finding nearest PC
                PCAvailability.getNearestPC(queryData, request, response);
            } else {
                // finding response for user's input from AIML file
                aimlInterpreter.findAnswerInLoadedAIMLFiles(queryData, (answer, wildCardArray, input) => {
                    // logging by default to see what's being searched for
                    console.log(input + ' | ' + answer);

                    if (answer === undefined) {
                        response.writeHead(200, {'Content-Type': 'text/plain'});
                        response.end("I'm sorry, I didn't quite understand what you said. Please try again.");
                    } else if (answer.substring(0, 6) === "SCRIPT") {
                        // extracting and evaluating the code from its identifier in brain.aiml
                        let evalResult = eval(answer.split(":")[1]);

                        // if evalResult is undefined then the server response was sent from inside an asynchronous method
                        if (evalResult !== undefined) {
                            response.writeHead(200, {'Content-Type': 'text/plain'});
                            response.end(evalResult);
                        } // end if
                    } else {
                        response.writeHead(200, {'Content-Type': 'text/plain'});
                        response.end(answer);
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