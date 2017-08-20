// for making requests to staff directory server
const request = require("request");

// for manipulating cookies
const Cookies = require("cookies");

// URL of the staff search API
const baseURL = "http://ws.nottingham.ac.uk/person-search/v1.0/staff/";

let identityString = "UoN-Bot:";

// creates a string with every name returned by this query
const listNames = resultObject => {
    let toReturn = "";
    resultObject.results.forEach((currentValue, index) => {
		// breaking up the list of names into more readable chunks
		if (index % 10 === 0) {
			toReturn += "\n";
		} // end if

		// determining whether or not to end the string
        index < resultObject.results.length - 1 ?
			toReturn += `${currentValue._givenName} ${currentValue._surname}, `
            :
			toReturn += ` or ${currentValue._givenName} ${currentValue._surname}?`;
    });
	return toReturn.trim()
};

// creates a readable string to denote what the user asked for
const doFormat = reqInfo => {
    switch (reqInfo) {
        case "_email":
			return "email address";
        case "_externalPhone":
			return "phone number";
        case "_department":
			return "department";
    }
};

const StaffSearch = {
	moduleCookieName: "StaffSearch",

    reqInfoCookieName: "StaffSearchRequiredInfo",

    search: (staffName, requiredInfo, serverRequest, serverResponse) => {
        request(baseURL + staffName, (error, respose, body) => {
            // error checking
            if (error) throw error;

            // return variable
            let responseString;

            // storing the search's response as an object
            let resultObject = JSON.parse(body);

            // formatting staff name to title case for readability
			staffName = staffName.split(" ").map(w => w[0].toUpperCase() + w.substr(1).toLowerCase()).join(" ");

            // checking if anything was returned and returning appropriate result
            if (resultObject.meta.noResults === 1) {
				let infoToReturn;

				// creating a link to e-mail address if necessary
				requiredInfo === "_email" ? infoToReturn = `<a href="mailto:${resultObject.results[0][requiredInfo]}" target="_blank">${resultObject.results[0][requiredInfo]}</a>`
					:
					infoToReturn = resultObject.results[0][requiredInfo];

				// checking whether the required information is listed for this staff member
                resultObject.results[0][requiredInfo] !== '' ?
					responseString = `<p>${identityString} ${staffName}'s ${doFormat(requiredInfo)} is ${infoToReturn}.</p>`
                    :
					responseString = `<p>${identityString} Unfortunately a/an ${doFormat(requiredInfo)} is not listed for ${staffName}.</p>`;
            } else if (resultObject.meta.noResults === 0) {
				responseString = `<p>${identityString} Unfortunately your search did not return any results. Please make sure your search term is spelled correctly.</p>`;
            } else {
                let cookies = new Cookies(serverRequest, serverResponse);

                // setting cookies so that the server knows what's happening
				cookies.set(StaffSearch.moduleCookieName, "multipleResults");
                cookies.set(StaffSearch.reqInfoCookieName, requiredInfo);

                // prompting user to select a single name
				responseString = `<p>${identityString} Your search has returned multiple matches, which member of staff did you mean? Please enter their full name.</p>\n<p>${listNames(resultObject)}</p>`
            } // end if/else

            // sending response back to user
			serverResponse.writeHead(200, {"Content-Type": "text/plain"});
            serverResponse.end(responseString);
        });
	}, // end search

    handleMultipleResults: (staffName, serverRequest, serverResponse) => {
        let cookies = new Cookies(serverRequest, serverResponse);

        // getting the user's required info from their cookie
        let requiredInfo = cookies.get(StaffSearch.reqInfoCookieName);

        // deleting the cookies
		cookies.set(StaffSearch.moduleCookieName, "", {"expires": new Date(0)});
        cookies.set(StaffSearch.reqInfoCookieName, "", {"expires": new Date(0)});

        // re-running the search with new name and same required info
        StaffSearch.search(staffName, requiredInfo, serverRequest, serverResponse);
	} // end handleMultipleResults
};

// exporting staff search as a module
module.exports = StaffSearch;