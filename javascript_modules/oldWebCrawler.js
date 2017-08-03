const request = require('request');
const cheerio = require('cheerio');

const plainWordsArray = [], unvisitedLinks = [], visitedLinks = [];
const allWordsFound = {};

let sortedObjectKeys;
let numDocs = 0;

const crawlPage = (reqURL) => {
    return new Promise((resolve, reject) => {
        request(reqURL, (error, response, body) => {
            if (error) reject(error);

            // removing current link from list of visited ones
            if (unvisitedLinks.indexOf(reqURL) !== -1) {
                unvisitedLinks.splice(unvisitedLinks.indexOf(reqURL), 1);
            } // end if

            // incrementing the total number of documents in the corpus so far
            numDocs++;

            // keeping track of total number of documents in corpus so far
            visitedLinks.push(reqURL);

            // loading web-page into a searc\able object
            const $ = cheerio.load(body);

            // looping through all <p> tags in page
            $('p').each((index, pElement) => {
                if ($(pElement).text().trim() !== "") {
                    // getting an array of each word inside the current <p> tag
                    let pWordsArray = $(pElement).text().toLowerCase().split(" ");

                    pWordsArray.forEach((currentValue) => {
                        // removing unwanted characters from the word
                        currentValue = currentValue.replace(/[\.\,\:\|\(\)\!]/g, "").replace(/\s+/g, "").trim();

                        // pushing the word into a centralised array
                        plainWordsArray.push(currentValue);
                    });
                } // end if
            });

            plainWordsArray.forEach((word) => {
                // checking if the word has been seen before
                if (allWordsFound[word] === undefined) {
                    // creating a new entry if it hasn't
                    allWordsFound[word] = {
                        "termFrequency": 1,
                        "documentFrequency": 1,
                        "tf-idf": undefined,
                        "urls": [reqURL]
                    };
                } else {
                    // incrementing the number of times this word has been seen
                    allWordsFound[word].termFrequency++;

                    // checking if the the word exists in a different document as well
                    if (!allWordsFound[word].urls.includes(reqURL)) {
                        allWordsFound[word].urls.push(reqURL);
                        allWordsFound[word].documentFrequency = allWordsFound[word].urls.length;
                    } // end if/else
                } // end if/else

                // calculating each word's tf-idf value
                allWordsFound[word]["tf-idf"] = allWordsFound[word].termFrequency * Math.log((numDocs / allWordsFound[word].documentFrequency));
            });

            // creating an associative array which is sorted in descending order of term frequency
            sortedObjectKeys = Object.keys(allWordsFound).sort((a, b) => {
                return allWordsFound[b]["termFrequency"] - allWordsFound[a]["termFrequency"];
            });

            // removing empty string from array and object if they exist
            if (sortedObjectKeys.indexOf('') !== -1) {
                delete allWordsFound[sortedObjectKeys['']];
                sortedObjectKeys.splice(sortedObjectKeys.indexOf(''), 1);
            } // end if

            // looping through all <a> tags
            $('a').each((index, element) => {
                // console.log(element.attribs.href);

                // go through all links and check if they've been visited, if not then add them to unvisited and resolve
            });
        });

        // resolving on the unvisited links so that the method can be called again
        resolve(unvisitedLinks);
    });
};

const WebCrawler = {
    doCrawl: (url) => {
        crawlPage(url).then((result) => {

            // crawlPage(result.pop());

            // result.forEach((currentValue) => {
            //     crawlPage(currentValue);
            // });
        });
    }
};

// exporting as a module
module.exports = WebCrawler;