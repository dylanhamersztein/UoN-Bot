// for reading in JSON file
const fs = require("fs");

// for getting locale-aware time
const moment = require("moment-timezone");

// holds contents of JSON file
let ShopTimesObject;

let identityString = "UoN-Bot:";

// convenience method for formatting the shop name to title case
let formatShopName = (shopName) => {
	return shopName.split(" ").map(w => w[0].toUpperCase() + w.substr(1).toLowerCase()).join(" ");
};

const ShopTimes = {
    initialise: () => {
		fs.readFile("./res/json/ShopTimes.json", (err, data) => {
            if (err) throw err;
            ShopTimesObject = JSON.parse(data);
        });
	}, // end initialise

	isOpen: input => {
        let shopLocation = input.split(" ")[0];
        let shopName = input.split(" ")[1];
        let shopOpeningTime, shopClosingTime;

        // getting a locale aware time object and the opening/closing time of requested shop
		let currentTime = moment().tz("Europe/London");

        // checking which day of the week it is and assigning the right values
        switch (currentTime.weekday()) {
			case 6:
                shopOpeningTime = moment(ShopTimesObject[shopName][shopLocation]["saturday"]["opening_time"], "hmm");
                shopClosingTime = moment(ShopTimesObject[shopName][shopLocation]["saturday"]["closing_time"], "hmm");
                break;
			case 7:
                shopOpeningTime = moment(ShopTimesObject[shopName][shopLocation]["sunday"]["opening_time"], "hmm");
                shopClosingTime = moment(ShopTimesObject[shopName][shopLocation]["sunday"]["closing_time"], "hmm");
                break;
            default:
                shopOpeningTime = moment(ShopTimesObject[shopName][shopLocation]["weekday"]["opening_time"], "hmm");
                shopClosingTime = moment(ShopTimesObject[shopName][shopLocation]["weekday"]["closing_time"], "hmm");
                break;
        } // end switch

        // checking the shop is open on the current date
        if (shopOpeningTime !== undefined && shopClosingTime !== undefined) {
            // checking that the shop is open at the current time
            if (shopOpeningTime.isBefore(currentTime) && currentTime.isBefore(shopClosingTime)) {
				return `<p>${identityString} Yes, the ${formatShopName(input)} is currently open and will close at ${shopClosingTime.format("HH:mm")}.</p>`;
            } else {
				return `<p>${identityString} The ${formatShopName(input)} is currently closed. It will open again at ${shopOpeningTime.format("HH:mm")} tomorrow.</p>`
            } // end if/else
        } else {
			return `<p>${identityString} The ${formatShopName(input)} is not open today.</p>`;
        } //end if/else
	}, // end isOpen

	getOpeningTime: input => {
		return `<p>${identityString} The ${formatShopName(input)} opens at ${moment(ShopTimesObject[input.split(" ")[1]][input.split(" ")[0]]["opening_time"], "hmm").format("HH:mm")}.</p>`;
	}, // end getOpeningTime

	getClosingTime: input => {
		return `<p>${identityString} The ${formatShopName(input)} closes at ${moment(ShopTimesObject[input.split(" ")[1]][input.split(" ")[0]]["closing_time"], "hmm").format("HH:mm")}.</p>`;
	} // end getClosingTime
};

// exporting module
module.exports = ShopTimes;