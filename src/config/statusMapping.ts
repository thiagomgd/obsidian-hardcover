export const HARDCOVER_STATUS_MAP = {
	1: "Want to Read",
	2: "Currently Reading",
	3: "Read",
	5: "Did Not Finish",
	// Status 4 (Paused) and Status 6 (Ignored) exist in API but not in HC UI
};

export const HARDCOVER_STATUS_MAP_REVERSE = {
	"Want to Read": 1,
	"Currently Reading": 2,
	"Read": 3,
	"Did Not Finish": 5,
	// "Paused" (4) and "Ignored" (6) exist in API but not in HC UI
};
