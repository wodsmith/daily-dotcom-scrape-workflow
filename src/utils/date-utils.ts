/**
 * Date utilities for handling Pacific Time (West Coast US) timezone
 */

/**
 * Get the current date in Pacific Time
 * Returns a Date object adjusted for Pacific Time (PT/PST)
 */
export function getCurrentPacificDate(): Date {
	const now = new Date();

	// Convert to Pacific Time using Intl.DateTimeFormat
	const pacificTimeString = now.toLocaleString('en-US', {
		timeZone: 'America/Los_Angeles',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});

	// Parse the Pacific time string back to a Date object
	const pacificDate = new Date(pacificTimeString);
	return pacificDate;
}

/**
 * Get the current date string in Pacific Time in YYYY-MM-DD format
 */
export function getCurrentPacificDateString(): string {
	const now = new Date();

	// Get Pacific date components
	const pacificDate = now.toLocaleDateString('en-CA', {
		timeZone: 'America/Los_Angeles'
	});

	return pacificDate; // Returns YYYY-MM-DD format
}

/**
 * Convert a date to Pacific Time and return as Unix timestamp (seconds)
 */
export function dateToUnixTimestamp(date: Date): number {
	return Math.floor(date.getTime() / 1000);
}

/**
 * Create a Date object from a date string, interpreting it as Pacific Time
 */
export function createPacificDate(dateString: string): Date {
	// Parse the date string as if it's in Pacific Time
	const date = new Date(dateString + 'T00:00:00');

	// Get the timezone offset for Pacific Time
	const pacificOffset = new Date().toLocaleString('en-US', {
		timeZone: 'America/Los_Angeles',
		timeZoneName: 'longOffset'
	}).match(/GMT([+-]\d{2}:\d{2})/)?.[1] || '-08:00';

	// Create a new date with Pacific timezone
	const pacificDate = new Date(dateString + 'T00:00:00' + pacificOffset);
	return pacificDate;
}

/**
 * Get start of day in Pacific Time for a given date
 */
export function getStartOfDayPacific(date: Date): Date {
	const year = date.getFullYear();
	const month = date.getMonth();
	const day = date.getDate();

	// Create date at midnight Pacific Time
	const pacificMidnight = new Date();
	pacificMidnight.setFullYear(year, month, day);
	pacificMidnight.setHours(0, 0, 0, 0);

	// Convert to Pacific Time
	const pacificTimeString = pacificMidnight.toLocaleString('en-US', {
		timeZone: 'America/Los_Angeles',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});

	return new Date(pacificTimeString);
}
