// for reading in files
const fs = require("fs");

// for searching the locally stored CS web-pages
const findInFiles = require("find-in-files");

// for dealing with cookies
const Cookies = require("cookies");

// for returning URLs to user
let fileNamesToLinks;

let identityString = "UoN-Bot:";

// class variables for consistent cookie naming
let searchTermCookieName = "searchTerm", currentPageCookieName = "currentPage";

const SearchEngine = {
	moduleCookieName: "SearchEngine",
	doSearch: (searchTerm, serverRequest, serverResponse, pageIndex) => {
		// loading the object which maps file names to the URLs from which their contents originated
		if (fileNamesToLinks === undefined) fileNamesToLinks = JSON.parse(fs.readFileSync("./res/json/FileNamesToLinks.json").toString());

		// doing the search and formatting the results
		findInFiles.find({"term": searchTerm, "flags": "ig"}, "./res/compsciwebsite", ".txt").then(results => {
			let toReturn;
			let cookies = new Cookies(serverRequest, serverResponse);

			// all files in which the search term was found
			let allMatchedFiles = Object.keys(results);

			// checking if the search returned anything
			if (allMatchedFiles.length > 0) {
				// calculating tf-idf for each result and storing it in the results object
				allMatchedFiles.forEach(fileName => results[fileName]["tf-idf"] = results[fileName].count * Math.log(Object.keys(fileNamesToLinks).length / allMatchedFiles.length));

				// sorting the file name array by descending value of tf-idf
				allMatchedFiles.sort((a, b) => {
					return results[b]["tf-idf"] - results[a]["tf-idf"];
				});

				// preparing the return string
				toReturn = `<p>${identityString} Your search has returned the following results:</p>\n`;

				// compiling all lines with the highest tf-idf score
				results[allMatchedFiles[pageIndex]].line.forEach(foundLine => {
					// filtering out unwanted things that the html-to-text library didn't
					if (!/(\[javascript:|search this section|email this page|you are here:|main menu)/gi.test(foundLine) && foundLine !== foundLine.toUpperCase() && foundLine !== "") {
						toReturn += `<p>${foundLine.trim()}</p>\n`;
					} // end if
				});

				let resourceURL = `<a href="${fileNamesToLinks[allMatchedFiles[pageIndex].split("\\")[2]]}" target="_blank">${fileNamesToLinks[allMatchedFiles[pageIndex].split("\\")[2]]}</a>`;

				// return a link to the page on which the match was found
				toReturn += `<p>${identityString} These results were found at: ${resourceURL}. This is page ${pageIndex + 1} of ${allMatchedFiles.length}.</p>`;

				// checking whether there is more than one matched page and informing the user
				if (allMatchedFiles.length > 1 && pageIndex < allMatchedFiles.length - 1) {
					toReturn += `\n<p>${identityString} Would you like to see results from the next most relevant page? [Y/N]</p>`;

					cookies.set(SearchEngine.moduleCookieName, "wantsNextPage");
					cookies.set(searchTermCookieName, searchTerm);
					cookies.set(currentPageCookieName, String(pageIndex));
				} else {
					// deleting the relevant cookies because there's no way another page can be retrieved
					cookies.set(SearchEngine.moduleCookieName, "", {"expires": new Date(0)});
					cookies.set(searchTermCookieName, "", {"expires": new Date(0)});
					cookies.set(currentPageCookieName, "", {"expires": new Date(0)});
				}// end if
			} else toReturn = `<p>${identityString} Unfortunately your search did not return any results. Please revise your search term.</p>`;

			// sending a response back to the user back to the user
			serverResponse.writeHead(200, {"Content-Type": "text/plain"});
			serverResponse.end(toReturn.trim());
		});
	},
	getNextPage: (input, serverRequest, serverResponse) => {
		let cookies = new Cookies(serverRequest, serverResponse);

		switch (input) {
			case "Y":
				// extracting information from the user's current search
				let currentPage = parseInt(cookies.get(currentPageCookieName));
				let searchTerm = cookies.get(searchTermCookieName);

				// rerunning the search but returning the next highest ranked page
				SearchEngine.doSearch(searchTerm, serverRequest, serverResponse, currentPage += 1);
				break;
			case "N":
				// deleting the relevant cookies
				cookies.set(SearchEngine.moduleCookieName, "", {"expires": new Date(0)});
				cookies.set(searchTermCookieName, "", {"expires": new Date(0)});
				cookies.set(currentPageCookieName, "", {"expires": new Date(0)});

				// confirming user's choice
				serverResponse.writeHead(200, {"Content-Type": "text/plain"});
				serverResponse.end(`<p>${identityString} The next page will not be retrieved. Is there anything else you want to ask me?</p>`);
				break;
			default:
				// informing user of bad input
				serverResponse.writeHead(200, {"Content-Type": "text/plain"});
				serverResponse.end(`<p>${identityString} Please only answer the question with 'Y' or 'N'.</p>`);
		} // end switch
	}
};

// exporting the module
module.exports = SearchEngine;