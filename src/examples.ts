// <docs-tag name="simple-workflow-example">
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

interface Env { }
type Params = {};

// Create your own class that implements a Workflow
export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
	// Define a run() method
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		// Define one or more steps that optionally return state.
		let state = step.do('my first step', async () => {
			return [1, 2, 3];
		});

		step.do('my second step', async () => {
			for (let data in state) {
				// Do something with your state
			}
		});
	}
}
// </docs-tag name="simple-workflow-example">

import { WodAnalysisAgent, type Workout } from './ai/agent';

/**
 * Example of how to use the new generateWorkoutObject method
 * This generates a structured workout object that can be inserted into your SQLite database
 */
export async function exampleWorkoutObjectGeneration(ai: Ai) {
	const agent = new WodAnalysisAgent(ai);

	// Example WOD text scraped from CrossFit.com
	const wodText = `
For Time:
21-15-9 reps of:
Thrusters (95/65 lb)
Pull-ups

Time cap: 15 minutes
	`.trim();

	try {
		// Generate structured workout object
		const workoutObject: Workout = await agent.generateWorkoutObject(wodText);

		console.log('Generated Workout Object:');
		console.log('ID:', workoutObject.id);
		console.log('Name:', workoutObject.name);
		console.log('Description:', workoutObject.description);
		console.log('Scheme:', workoutObject.scheme);
		console.log('Reps per round:', workoutObject.repsPerRound);
		console.log('Rounds to score:', workoutObject.roundsToScore);
		console.log('Tiebreak scheme:', workoutObject.tiebreakScheme);

		// This object can now be inserted into your SQLite database
		// Example SQL: INSERT INTO workouts (id, name, description, scheme, ...) VALUES (?, ?, ?, ?, ...)

		return workoutObject;
	} catch (error) {
		console.error('Error generating workout object:', error);
		throw error;
	}
}

/**
 * Example showing different types of workouts and their expected schemes
 */
export const exampleWods = {
	// Time-based workout (For Time)
	forTime: `
For Time:
21-15-9 reps of:
Thrusters (95/65 lb)
Pull-ups
`,

	// AMRAP (As Many Rounds As Possible)
	amrap: `
AMRAP 20:
10 Burpees
15 Pull-ups
20 Air Squats
`,

	// EMOM (Every Minute On the Minute)
	emom: `
EMOM 12:
5 Strict Pull-ups
10 Push-ups
15 Air Squats
`,

	// Time with cap
	timeWithCap: `
For Time (15 min cap):
100 Burpees for time
`,

	// Max reps
	maxReps: `
In 10 minutes:
Max Calories on Assault Bike
`,

	// Load-based (1RM)
	maxLoad: `
Work up to a 1RM Back Squat
`,

	// Distance-based
	distance: `
Run 5K for time
`,
};

/**
 * Function to test different workout types
 */
export async function testDifferentWorkoutTypes(ai: Ai) {
	const agent = new WodAnalysisAgent(ai);

	for (const [type, wodText] of Object.entries(exampleWods)) {
		console.log(`\n=== Testing ${type.toUpperCase()} ===`);
		try {
			const workout = await agent.generateWorkoutObject(wodText.trim());
			console.log(`Generated scheme: ${workout.scheme}`);
			console.log(`Workout name: ${workout.name}`);
			if (workout.repsPerRound) {
				console.log(`Reps per round: ${workout.repsPerRound}`);
			}
		} catch (error) {
			console.error(`Error processing ${type}:`, error);
		}
	}
}