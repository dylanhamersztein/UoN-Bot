// sorting pc locations in ascending distance order
let sortedKeys = Object.keys(PCLocationObject).sort((a, b) => {
    if (PCLocationObject[a]["coordinates"] !== undefined && PCLocationObject[b]["coordinates"] !== undefined) {
        return calcDist(userLatitude, userLongitude, PCLocationObject[a]["coordinates"][0], PCLocationObject[a]["coordinates"][1]) - calcDist(userLatitude, userLongitude, PCLocationObject[b]["coordinates"][0], PCLocationObject[b]["coordinates"][1])
    }
});

let allLinksArray = [];

// removing entries which don't have coordinates
sortedKeys.forEach((location, index, array) => {
    if (location === "hallwardL1" || location === "hallwardL2" || location === "hallwardL3" || location === "hallwardL4") {
        array.splice(index, 1, "hallward");
    }
});

// compiling all links into a single normalised array
sortedKeys.forEach((location, index, array) => {
    PCLocationObject[location]["links"].forEach((element) => {
        if (!allLinksArray.includes(element)) {
            allLinksArray = allLinksArray.concat(PCLocationObject[location]["links"]);
        }
    });
});
sortedKeys.splice(sortedKeys.lastIndexOf("hallward"), 1);

// console.log(sortedKeys);
// console.log(allLinksArray);

// console.log("sortedKeys ", sortedKeys.length); // 21
// console.log("allLinksArray ", allLinksArray.length); // 24

allLinksArray.forEach((currentElement, index) => {
    // making each request individually as a promise
    makeSingleRequestAsPromise(sortedKeys[index], currentElement).then((result) => {
        asyncCallResultsArray.push(result);

        // checking whether all calls have returned (there will be as many responses as there were links passed into the method)
        if (asyncCallResultsArray.length === allLinksArray.length) {
            console.dir(asyncCallResultsArray);

            // clearing results for the array's next use
            // asyncCallResultsArray = [];

            // sending the response back to the user
            // serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
            // serverResponse.end(response);
        } // end if
    });
});