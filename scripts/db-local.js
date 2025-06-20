#!/usr/bin/env node

/**
 * Local database testing utility
 * Provides easy commands to interact with the local D1 database
 */

const commands = {
	"list-tables": "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
	"list-workouts": "SELECT id, name, scheme FROM workouts ORDER BY created_at DESC;",
	"list-tracks": "SELECT id, name, type FROM programming_track ORDER BY created_at DESC;",
	"list-track-workouts": "SELECT tw.id, tw.day_number, w.name as workout_name, pt.name as track_name FROM track_workout tw JOIN workouts w ON tw.workout_id = w.id JOIN programming_track pt ON tw.track_id = pt.id ORDER BY tw.day_number;",
	"list-scheduled": "SELECT swi.id, swi.scheduled_date, w.name as workout_name FROM scheduled_workout_instance swi JOIN track_workout tw ON swi.track_workout_id = tw.id JOIN workouts w ON tw.workout_id = w.id ORDER BY swi.scheduled_date DESC;",
	"count-all": "SELECT 'workouts' as table_name, COUNT(*) as count FROM workouts UNION ALL SELECT 'programming_track', COUNT(*) FROM programming_track UNION ALL SELECT 'track_workout', COUNT(*) FROM track_workout UNION ALL SELECT 'scheduled_workout_instance', COUNT(*) FROM scheduled_workout_instance;"
};

const command = process.argv[2];

if (!command || !commands[command]) {
	console.log("Available commands:");
	Object.keys(commands).forEach(cmd => {
		console.log(`  ${cmd}`);
	});
	process.exit(1);
}

const { spawn } = require('child_process');

const wrangler = spawn('wrangler', [
	'd1', 'execute', 'wodsmith-db', 
	'--local', 
	'--command', 
	commands[command]
], {
	stdio: 'inherit',
	cwd: process.cwd()
});

wrangler.on('error', (err) => {
	console.error('Failed to start wrangler:', err);
	process.exit(1);
});

wrangler.on('close', (code) => {
	process.exit(code);
});
