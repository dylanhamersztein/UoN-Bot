const fs = require("fs");
const findInFiles = require("find-in-files");
const Cookies = require("cookies");

let fileNamesToLinks;

let searchTermCookieName = "searchTerm", currentPageCookieName = "currentPage";
const SearchEngine = {
	moduleCookieName: "SearchEngine",
	doSearch: (searchTerm, serverRequest, serverResponse, pageIndex) => {
		// loading the object which maps file names to the URLs from which their contents originated
		if (fileNamesToLinks === undefined) fileNamesToLinks = JSON.parse(fs.readFileSync("./res/json/FileNamesToLinks.json"));

		// doing the search and formatting the results
		findInFiles.find({"term": searchTerm, "flags": "ig"}, "./res/compsciwebsite", '.txt').then(results => {
			let toReturn;
			let cookies = new Cookies(serverRequest, serverResponse);

			// all files in which the search term was found
			let allMatchedFiles = Object.keys(results);

			// checking if the search returned anything
			if (allMatchedFiles.length > 0) {
				// number of documents in the entire corpus
				let numDocs = Object.keys(fileNamesToLinks).length;

				// calculating tf-idf for each result and storing it in the object
				allMatchedFiles.forEach(fileName => {
					results[fileName]["tf-idf"] = results[fileName].count * Math.log(numDocs / allMatchedFiles.length);
				});

				// sorting the file name array by descending value of tf-idf
				allMatchedFiles.sort((a, b) => {
					return results[b]["tf-idf"] - results[a]["tf-idf"];
				});

				// preparing the return string
				toReturn = "Your search has returned the following results:\n";

				// compiling all lines with the highest tf-idf score
				results[allMatchedFiles[pageIndex]].line.forEach((foundLine, index, array) => {
					// filtering out unwanted things that the html-to-text library didn't
					if (!/(\[javascript:|search this section|email this page|you are here:|main menu)/gi.test(foundLine) && foundLine !== foundLine.toUpperCase() && foundLine !== "") {
						toReturn += `${foundLine.trim()}\n`;
					} // end if
				});

				// return a link to the page on which the match was found
				toReturn += `These results were found at: ${fileNamesToLinks[allMatchedFiles[pageIndex].split("\\")[2]]}. This is page ${pageIndex + 1} of ${totalAppearances}.`;

				// checking whether there is more than one matched page and informing the user
				if (allMatchedFiles.length > 1 && pageIndex < allMatchedFiles.length - 1) {
					toReturn += "\nWould you like to see results from the next most relevant page? [Y/N]";

					cookies.set(SearchEngine.moduleCookieName, "wantsNextPage");
					cookies.set(searchTermCookieName, searchTerm);
					cookies.set(currentPageCookieName, String(pageIndex));
				} else {
					// deleting the relevant cookies because there's no way another page can be retrieved
					cookies.set(SearchEngine.moduleCookieName, "", {"expires": new Date(0)});
					cookies.set(searchTermCookieName, "", {"expires": new Date(0)});
					cookies.set(currentPageCookieName, "", {"expires": new Date(0)});
				}// end if
			} else toReturn = "Unfortunately your search did not return any results. Please revise your search term.";

			// sending a response back to the user back to the user
			serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
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
				serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
				serverResponse.end("Next page will not be retrieved. Is there anything else you want to ask me?");
				break;
			default:
				// informing user of bad input
				serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
				serverResponse.end("Please only answer the question with 'Y' or 'N'.");
		} // end switch
	}
};

// exporting the module
module.exports = SearchEngine;