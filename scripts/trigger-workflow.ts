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

const today = getCurrentPacificDateString();
const params = `{"date":"${today}"}`;

console.log(`Triggering workflow for Pacific Time date: ${today}`);

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