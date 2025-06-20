// <docs-tag name="full-workflow-example">
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { createLogger } from './utils/logger';
import { generateWodUrl, fetchWodPage, extractWodDetails, type WodDetails } from './scraper/dotcom-scraper';
import { WodAnalysisAgent, type WodAnalysis, type Workout } from './ai/agent';
import { DatabaseService } from './services/database.service';

type Env = {
	// Add your bindings here, e.g. Workers KV, D1, Workers AI, etc.
	DAILY_SCRAPE_WORKFLOW: Workflow;
	WOD_QUEUE: Queue;
	AI: Ai; // Cloudflare Workers AI binding
	DB: D1Database; // D1 database binding
	DEFAULT_TRACK_ID: string;
	TEAM_ID: string;
	USER_ID: string;
};

// User-defined params passed to your workflow
type Params = {
	date: string;
};

// <docs-tag name="workflow-entrypoint">
export class DailyScrapeWorkflow extends WorkflowEntrypoint<Env, Params> {
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		// Can access bindings on `this.env`
		// Can access params on `event.payload`

		// You can optionally have a Workflow wait for additional data:
		// human approval or an external webhook or HTTP request, before progressing.
		// You can submit data via HTTP POST to /accounts/{account_id}/workflows/{workflow_name}/instances/{instance_id}/events/{eventName}
		// const waitForApproval = await step.waitForEvent('request-approval', {
		// 	type: 'approval', // define an optional key to switch on
		// 	timeout: '1 minute', // keep it short for the example!
		// });

		// await step.sleep('wait on something', '1 minute');

		// await step.do(
		// 	'make a call to write that could maybe, just might, fail',
		// 	// Define a retry strategy
		// 	{
		// 		retries: {
		// 			limit: 5,
		// 			delay: '5 second',
		// 			backoff: 'exponential',
		// 		},
		// 		timeout: '15 minutes',
		// 	},
		// 	async () => {
		// 		// Do stuff here, with access to the state from our previous steps
		// 		if (Math.random() > 0.5) {
		// 			throw new Error('API call to $STORAGE_SYSTEM failed');
		// 		}
		// 	},
		// );

		const workflowId = event.instanceId;
		const dateInput = event.payload.date;
		const date = new Date(dateInput);
		const wfLogger = createLogger(`Workflow:dailyScrapeWorkflow:${workflowId}`);

		try {
			wfLogger.info(`Step: Generating URL for ${date.toISOString().split("T")[0]}.`);
			const wodUrl = generateWodUrl(date);

			wfLogger.info(`Step: Fetching page ${wodUrl}.`);
			const htmlContent = await step.do("fetch-wod-page", async () => {
				return fetchWodPage(wodUrl);
			});

			wfLogger.info("Step: Extracting WOD details.");

			const wodDetails = await step.do("extract-wod-details", async () => {
				return extractWodDetails(htmlContent);
			});


			let aiAnalysis: WodAnalysis | null = null;
			let workoutObject: Workout | null = null;
			let workoutSuggestions: string[] = [];
			let dbResults: any = null;

			if (wodDetails.isRestDay) {
				wfLogger.info("Step: Today is a rest day on CrossFit.com.");
			} else if (wodDetails.wodText) {
				wfLogger.info(
					`Step: Successfully scraped WOD: ${wodDetails.wodText}...`,
				);

				// Initialize AI agent and analyze the WOD
				const aiAgent = new WodAnalysisAgent(this.env.AI);

				// Generate structured workout object for database insertion
				workoutObject = await step.do("generate-workout-object", async () => {
					return aiAgent.generateWorkoutObject(wodDetails.wodText || '');
				});

				wfLogger.info(`Step: Generated structured workout object - ${JSON.stringify(workoutObject, null, 2)}`);

				// Database operations
				if (workoutObject) {
					dbResults = await step.do("database-operations", async () => {
						const dbService = new DatabaseService(this.env.DB);
						// Configuration from environment variables
						const defaultTrackId = this.env.DEFAULT_TRACK_ID || 'ptrk_crossfit_dotcom';
						const teamId = this.env.TEAM_ID || 'team_cokkpu1klwo0ulfhl1iwzpvn';
						const userId = this.env.USER_ID || 'usr_cynhnsszya9jayxu0fsft5jg';

						// Create workout data for database insertion (workoutObject is guaranteed non-null here)
						const workoutData = {
							id: workoutObject!.id,
							name: workoutObject!.name,
							description: workoutObject!.description,
							scope: 'public' as const,
							scheme: workoutObject!.scheme,
							repsPerRound: workoutObject!.repsPerRound || undefined,
							roundsToScore: workoutObject!.roundsToScore || undefined,
							tiebreakScheme: workoutObject!.tiebreakScheme || undefined,
							secondaryScheme: workoutObject!.secondaryScheme || undefined,
							userId: userId,
							sourceTrackId: defaultTrackId
						};

						// Insert workout
						const workoutId = await dbService.insertWorkout(workoutData);
						wfLogger.info(`Workout inserted with ID: ${workoutId}`);

						// Get next day number for the track
						const dayNumber = await dbService.getNextDayNumberForTrack(defaultTrackId);

						// Add workout to track
						const trackWorkoutId = await dbService.addWorkoutToTrack(
							workoutId,
							defaultTrackId,
							dayNumber,
							undefined,
							`CrossFit.com WOD for ${dateInput}`
						);
						wfLogger.info(`Workout added to track with ID: ${trackWorkoutId}`);

						// Schedule workout for today
						const scheduledInstanceId = await dbService.scheduleWorkoutForDate(
							trackWorkoutId,
							teamId,
							date,
							`Daily WOD from CrossFit.com`,
							'Scale as needed for your fitness level'
						);
						wfLogger.info(`Workout scheduled with ID: ${scheduledInstanceId}`);

						return {
							workoutId,
							trackWorkoutId,
							scheduledInstanceId,
							dayNumber
						};
					});

					wfLogger.info(`Database operations completed successfully: ${JSON.stringify(dbResults)}`);
				}
				// aiAnalysis = await step.do("analyze-wod-with-ai", async () => {
				// 	return aiAgent.analyzeWod(wodDetails.wodText || '');
				// });

				// wfLogger.info(`Step: AI Analysis completed - Difficulty: ${aiAnalysis.difficulty}, Movements: ${aiAnalysis.movements.join(', ')}`);

				// // Generate workout suggestions
				// workoutSuggestions = await step.do("generate-workout-suggestions", async () => {
				// 	return aiAgent.generateWorkoutSuggestions(wodDetails);
				// });

				wfLogger.info(`Step: Generated ${workoutSuggestions.length} workout suggestions`);
			} else {
				wfLogger.warn("Step: Could not scrape WOD details.");
			}



			return {
				status: "completed",
				date: dateInput,
				wodDetails,
				workoutObject, // New structured workout object for database
				databaseResults: dbResults, // Database operation results
				aiAnalysis,
				workoutSuggestions,
			};
		} catch (err: any) {
			wfLogger.error(`Workflow failed: ${err?.message || err}`);
			if (err?.stack) {
				wfLogger.error(`Stack trace: ${err.stack}`);
			}
			console.error('Workflow failed:', err);
			if (err?.stack) {
				console.error('Stack trace:', err.stack);
			}
			throw err;
		}
	}
}

// </docs-tag name="workflow-entrypoint">

// <docs-tag name="workflows-fetch-handler">
export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		try {
			let url = new URL(req.url);

			if (url.pathname.startsWith('/favicon')) {
				return Response.json({}, { status: 404 });
			}

			// Get the status of an existing instance, if provided
			// GET /?instanceId=<id here>
			let id = url.searchParams.get('instanceId');
			if (id) {
				let instance = await env.DAILY_SCRAPE_WORKFLOW.get(id);
				return Response.json({
					status: await instance.status(),
				});
			}

			// Spawn a new instance and return the ID and status
			const today = new Date();
			const dateString = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
			let instance = await env.DAILY_SCRAPE_WORKFLOW.create({
				params: { date: dateString },
			});
			return Response.json({
				id: instance.id,
				details: await instance.status(),
			});
		} catch (err: any) {
			console.error('Fetch handler failed:', err);
			if (err?.stack) {
				console.error('Stack trace:', err.stack);
			}
			return Response.json({ error: err?.message || String(err) }, { status: 500 });
		}
	},
};
// </docs-tag name="workflows-fetch-handler">

// Export a scheduled handler to trigger the workflow daily
export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
	try {
		const today = new Date();
		const dateString = today.toISOString().split('T')[0];
		const logger = createLogger('Scheduled:dailyScrapeWorkflow');
		logger.info(`Scheduled event triggered for ${dateString}`);
		const instance = await env.DAILY_SCRAPE_WORKFLOW.create({
			params: { date: dateString },
		});
		// Optionally, push a message to the queue for observability

	} catch (err: any) {
		console.error('Scheduled handler failed:', err);
		if (err?.stack) {
			console.error('Stack trace:', err.stack);
		}
		throw err;
	}
}

// </docs-tag name="full-workflow-example">
