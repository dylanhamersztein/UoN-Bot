// for making requests to staff directory server
const request = require("request");

// for manipulating cookies
const Cookies = require("cookies");

// URL of the staff search API
const baseURL = "http://ws.nottingham.ac.uk/person-search/v1.0/staff/";

// creates a string with every name returned by this query
const listNames = (resultObject) => {
    let toReturn = "";
    resultObject.results.forEach((currentValue, index) => {
        index < resultObject.results.length - 1 ?
            toReturn += currentValue._givenName + " " + currentValue._surname + ", "
            :
            toReturn += " or " + currentValue._givenName + " " + currentValue._surname + "?";
    });
    return toReturn.trim();
};

// creates a readable string to denote what the user asked for
const doFormat = (reqInfo) => {
    switch (reqInfo) {
        case "_email":
            return "an email address";
        case "_externalPhone":
            return "a phone number";
        case "_department":
            return "a department";
    }
};

const StaffSearch = {
    cookieName: "StaffSearch",
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
            staffName = staffName.split(' ').map(w => w[0].toUpperCase() + w.substr(1).toLowerCase()).join(' ');

            // checking if anything was returned and returning appropriate result
            if (resultObject.meta.noResults === 1) {
                // checking whether the required information is listed for this staff member
                resultObject.results[0][requiredInfo] !== '' ?
                    responseString = staffName + "'s " + doFormat(requiredInfo) + " is " + resultObject.results[0][requiredInfo] + "."
                    :
                    responseString = "Unfortunately " + doFormat(requiredInfo) + " is not listed for " + staffName + ".";
            } else if (resultObject.meta.noResults === 0) {
                responseString = "Unfortunately your search did not return any results. Please make sure your search term is spelled correctly."
            } else {
                let cookies = new Cookies(serverRequest, serverResponse);

                // setting cookies so that the server knows what's happening
                cookies.set(StaffSearch.cookieName, "multipleResults");
                cookies.set(StaffSearch.reqInfoCookieName, requiredInfo);

                // prompting user to select a single name
                responseString = "Your search has returned multiple matches, which member of staff did you mean? Please enter their full name.\n" +
                    listNames(resultObject)
            } // end if/else

            // sending response back to user
            serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
            serverResponse.end(responseString);
        });
    },
    handleMultipleResults: (staffName, serverRequest, serverResponse) => {
        let cookies = new Cookies(serverRequest, serverResponse);

        // getting the user's required info from their cookie
        let requiredInfo = cookies.get(StaffSearch.reqInfoCookieName);

        // deleting the cookies
        cookies.set(StaffSearch.cookieName, "", {"expires": new Date(0)});
        cookies.set(StaffSearch.reqInfoCookieName, "", {"expires": new Date(0)});

        // re-running the search with new name and same required info
        StaffSearch.search(staffName, requiredInfo, serverRequest, serverResponse);
    }
};

// exporting staff search as a module
module.exports = StaffSearch;