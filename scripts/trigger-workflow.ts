#!/usr/bin/env bun

// Export to make this a module
export { };

const today = new Date().toISOString().split('T')[0];
const params = `{"date":"${today}"}`;

console.log(`Triggering workflow for date: ${today}`);

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