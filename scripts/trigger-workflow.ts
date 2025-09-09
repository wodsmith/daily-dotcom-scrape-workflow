#!/usr/bin/env bun

// Export to make this a module
export { };

// Get current date in Pacific Time
const getCurrentPacificDateString = (): string => {
	const now = new Date();

	// Get Pacific date components
	const pacificDate = now.toLocaleDateString('en-CA', {
		timeZone: 'America/Los_Angeles'
	});

	return pacificDate; // Returns YYYY-MM-DD format
};

// Parse optional date argument (expects YYYY-MM-DD)
const inputDate = Bun.argv[2];

// Determine the target date
const targetDate = inputDate || getCurrentPacificDateString();

// Validate provided date format if arg was given
if (inputDate && !/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
	console.error("Invalid date format. Expected YYYY-MM-DD");
	process.exit(1);
}

const params = `{"date":"${targetDate}"}`;

console.log(`Triggering workflow for date: ${targetDate}`);

const proc = Bun.spawn([
	"pnpm",
	"wrangler",
	"workflows",
	"trigger",
	"dotcom-scraper-workflow",
	"--params",
	params
]);

const stdout = await new Response(proc.stdout).text();
const stderr = await new Response(proc.stderr).text();

if (stdout) console.log(stdout);
if (stderr) console.error(stderr);

process.exit(proc.exitCode);
