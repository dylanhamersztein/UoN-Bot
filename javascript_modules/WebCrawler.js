const fs = require("fs");
const Crawler = require("simplecrawler");
const cheerio = require("cheerio");

let crawler;

const WebCrawler = {
    initialiseWebCrawler: (url) => {
        // defining the url the crawler should start on
        crawler = new Crawler(url);

        // setting up behaviour of crawler
        crawler.on("fetchcomplete", (queueItem, responseBuffer, response) => {
            // console.log("Fetched resource at " + queueItem.url);

            // loading web-page into cheerio/jquery object
            const $ = cheerio.load(responseBuffer.toString());

            // extracting the page's title for file-naming purposes
            let title = $("title").text();

            // formatting the title to an appropriate file name
            title = title.replace(/[^A-Za-z]/g, "");

            // extracting all the text found on the page
            let allText = $("body").text();

            // removing all unwanted text
            let tmpArray = allText.split("\n").filter(entry => entry.trim() !== "" && !entry.includes("<p>"));

            // converting page's text into one line per block of text
            let finalString = tmpArray.join(" ").replace(/\s\s+/g, ' ').replace(/\. /g, ".\n");

            // writing this text to a local file for searching
            fs.writeFile("./res/html/" + title + ".txt", finalString, (err) => {
                if (err) throw err
            });
        });

        crawler.on("complete", () => console.log("Finished web crawl."));

        // setting crawler properties
        crawler.interval = 200;
        crawler.maxConcurrency = 5;
        crawler.maxDepth = 2;

        // ensures only <a> tags are returned for crawling
        crawler.discoverResources = (buffer, queueItem) => {
            let $ = cheerio.load(buffer.toString("utf8"));
            return $("a[href]").map(function () {
                return $(this).attr("href");
            }).get();
        };

        // narrowing the search to only the computer science/research web-pages
        crawler.addFetchCondition(queueItem => queueItem.url.match(/(ComputerScience)/i));

        // excluding pdf files from search
        crawler.addFetchCondition(queueItem => !queueItem.path.match(/\.pdf$/i));

        // starting the crawl
        crawler.start();
    }
};

// exporting the module
module.exports = WebCrawler;