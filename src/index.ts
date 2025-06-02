// <docs-tag name="full-workflow-example">
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { createLogger } from './utils/logger';
import { generateWodUrl, fetchWodPage, extractWodDetails, type WodDetails } from './scraper/dotcom-scraper';

type Env = {
	// Add your bindings here, e.g. Workers KV, D1, Workers AI, etc.
	DAILY_SCRAPE_WORKFLOW: Workflow;
	WOD_QUEUE: Queue;
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

		wfLogger.info(`Step: Generating URL for ${date.toISOString().split("T")[0]}.`);
		const wodUrl = generateWodUrl(date);

		wfLogger.info(`Step: Fetching page ${wodUrl}.`);
		const htmlContent = await step.do("fetch-wod-page", async () => {
			return fetchWodPage(wodUrl);
		});

		wfLogger.info("Step: Extracting WOD details.");
		const wodDetails: WodDetails = extractWodDetails(htmlContent);

		if (wodDetails.isRestDay) {
			wfLogger.info("Step: Today is a rest day on CrossFit.com.");
		} else if (wodDetails.wodText) {
			wfLogger.info(
				`Step: Successfully scraped WOD: ${wodDetails.wodText}...`,
			);
		} else {
			wfLogger.warn("Step: Could not scrape WOD details.");
		}

		// Push WOD details to the queue
		await step.do("push-to-queue", async () => {
			await this.env.WOD_QUEUE.send({
				date: dateInput,
				wodDetails,
			});
		});

		return {
			status: "completed",
			date: dateInput,
			wodDetails,
		};
	}
}

// </docs-tag name="workflow-entrypoint">

// <docs-tag name="workflows-fetch-handler">
export default {
	async fetch(req: Request, env: Env): Promise<Response> {
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
		// You can also set the ID to match an ID in your own system
		// and pass an optional payload to the Workflow
		// let instance = await env.MY_WORKFLOW.create({
		// 	id: 'id-from-your-system',
		// 	params: { payload: 'to send' },
		// });
		return Response.json({
			id: instance.id,
			details: await instance.status(),
		});
	},
};
// </docs-tag name="workflows-fetch-handler">

// Export a scheduled handler to trigger the workflow daily
export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
	const today = new Date();
	const dateString = today.toISOString().split('T')[0];
	const logger = createLogger('Scheduled:dailyScrapeWorkflow');
	logger.info(`Scheduled event triggered for ${dateString}`);
	const instance = await env.DAILY_SCRAPE_WORKFLOW.create({
		params: { date: dateString },
	});
	// Optionally, push a message to the queue for observability
	await env.WOD_QUEUE.send({
		date: dateString,
		event: 'scheduled',
	});
}

// </docs-tag name="full-workflow-example">
