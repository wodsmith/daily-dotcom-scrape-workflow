import { z } from 'zod';
import { createLogger } from '../utils/logger';

const logger = createLogger('AIAgent');

// Schema for the workout object that matches your SQLite table
export const WorkoutSchema = z.object({
	id: z.string().describe('Unique identifier for the workout'),
	name: z.string().describe('Name or title of the workout'),
	description: z.string().describe('Detailed description of the workout'),
	scope: z.enum(['private', 'public']).default('private').describe('Visibility scope of the workout'),
	scheme: z.enum([
		'time',
		'time-with-cap',
		'pass-fail',
		'rounds-reps',
		'reps',
		'emom',
		'load',
		'calories',
		'meters',
		'feet',
		'points'
	]).describe('Primary scoring scheme for the workout'),
	repsPerRound: z.number().nullable().optional().describe('Number of reps per round if applicable'),
	roundsToScore: z.number().default(1).describe('Number of rounds that count towards the score'),
	tiebreakScheme: z.enum(['time', 'reps']).nullable().optional().describe('Tiebreaker scoring method'),
	secondaryScheme: z.enum([
		'time',
		'pass-fail',
		'rounds-reps',
		'reps',
		'emom',
		'load',
		'calories',
		'meters',
		'feet',
		'points'
	]).nullable().optional().describe('Secondary scoring scheme if applicable'),
	teamSpecificNotes: z.string().nullable().optional().describe('Team-specific notes for stimulus and strategy'),
	scalingGuidance: z.string().nullable().optional().describe('Scaling guidance for the day'),
});

export type Workout = z.infer<typeof WorkoutSchema>;

// Legacy interface for backward compatibility
export interface WodAnalysis {
	summary: string;
	movements: string[];
	difficulty: 'beginner' | 'intermediate' | 'advanced';
	estimatedTime: string;
	equipment: string[];
	tags: string[];
}

export class WodAnalysisAgent {
	constructor(private ai: Ai) { }

	/**
	 * Analyzes a WOD text and generates a structured workout object
	 * that matches the SQLite database schema
	 */
	async generateWorkoutObject(wodText: string): Promise<Workout> {
		logger.info('Generating structured workout object from WOD text');

		// Add current timestamp to ensure unique IDs even for similar workouts
		const timestamp = Date.now().toString(36);
		const randomComponent = Math.random().toString(36).substring(2, 6);

		const prompt = `Convert this CrossFit WOD into structured JSON data. Return only valid JSON.

WOD TEXT:
${wodText}

REQUIRED JSON FORMAT:
{
	"id": "descriptive-slug-${timestamp}-${randomComponent}",
	"name": "workout name or generate from content",
	"description": "exact WOD flow in markdown (exclude stimulus/scaling sections)",
	"scope": "private",
	"scheme": "scoring_type",
	"repsPerRound": number_or_null,
	"roundsToScore": 1,
	"tiebreakScheme": "time|reps|null",
	"secondaryScheme": "secondary_type|null",
	"teamSpecificNotes": "markdown stimulus/strategy guidance",
	"scalingGuidance": "markdown scaling options"
}

SCHEME OPTIONS: time, time-with-cap, rounds-reps, reps, emom, load, calories, meters, feet, points, pass-fail

RULES:
1. ID: Create descriptive slug + provided timestamp/random components
2. Name: Use given name when provided (strip any markdown from name) OR generate based on date so "2025-06-01" becomes "CrossFit.com 20250601"
3. Description: Copy exact WOD structure in markdown, remove stimulus/scaling sections
4. teamSpecificNotes: Extract stimulus/strategy guidance from WOD text
5. scalingGuidance: Extract scaling options

General Guidelines:
	- Extract or create a clear workout name
	- Provide detailed description including movements and structure
	- Choose the most appropriate primary scheme
	- Set repsPerRound if it's a rounds-based workout
	- Set roundsToScore (usually 1 for most workouts, higher for multi-round scoring)
	- Include tiebreakScheme only if there's a clear tiebreaker
	- Include secondaryScheme only if there's a secondary scoring component
	- Use meters when distance is involved

For teamSpecificNotes property:
	- Look for stimulus, strategy, or coaching sections in the WOD text
	- Extract key points about workout intent, pacing, and strategy
	- Format as valid markdown with appropriate headers and lists
	- If no specific stimulus/strategy section is found, provide general guidance based on the workout structure

For scalingGuidance property:
	- Look for scaling, modifications, beginner, or intermediate sections in the WOD text
	- Extract all scaling options including movement modifications, load adjustments, and rep schemes
	- Include beginner and intermediate options if mentioned
	- Format as valid markdown with clear headers and bullet points
	- If no scaling section is found, provide appropriate scaling suggestions based on the movements

For name property:
- When a name is not explicitly provided, generate a descriptive name based on the workout content
- When a name is provided, use it directly without modification
- Ensure the name is concise but descriptive enough to understand the workout type
- Avoid generic names like "For time:" or "AMRAP"

For Description Property:
	- Keep the flow of the workout the exact same as the original WOD text
	- Use markdown formatting for clarity
	- remove Stimulus and Strategy section from description
	- remove Scaling section from description
	- good example
	For time:
	50 double-unders
	50 ring dips
	50 double-unders
	50 dumbbell box step-ups
	50 double-unders
	50 burpees
	50 double-unders
	- bad example
	A chipper-style workout consisting of 50 double-unders, 50 ring dips, 50 double-unders, 50 dumbbell box step-ups, 50 double-unders, and 50 burpees. The workout is designed to be completed as fast as possible, with advanced athletes aiming to finish in under 12 minutes.

REMEMBER: Return only valid JSON, no extra text.`;

		try {
			const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
				messages: [
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: 1024,
				temperature: 0.2
			});

			logger.info('AI response received for workout object generation');

			// Handle the response properly based on Cloudflare Workers AI output
			let workoutText: string;
			if (typeof response === 'string') {
				workoutText = response;
			} else if (response && typeof response === 'object' && 'response' in response) {
				workoutText = (response as any).response || '';
			} else {
				workoutText = JSON.stringify(response);
			}

			// Clean the response text - remove markdown code blocks if present
			let cleanedText = workoutText.trim();

			// Remove markdown code block markers if present
			if (cleanedText.startsWith('```json')) {
				cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
			} else if (cleanedText.startsWith('```')) {
				cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
			}

			// Parse and validate the response
			const workoutData = JSON.parse(cleanedText);

			// Validate against our schema using zod
			const validatedWorkout = WorkoutSchema.parse(workoutData);

			logger.info('Structured workout object generated and validated successfully');
			return validatedWorkout;
		} catch (error) {
			logger.error('Error generating workout object:', error);

			// Generate a fallback workout object with basic info extracted from the text
			// Add timestamp and random component to ensure uniqueness
			const baseId = wodText
				.toLowerCase()
				.replace(/[^a-z0-9\s]/g, '')
				.trim()
				.split(/\s+/)
				.slice(0, 3)
				.join('-') || 'workout';

			const timestamp = Date.now().toString(36);
			const randomStr = Math.random().toString(36).substring(2, 8);
			const fallbackId = `${baseId}-${timestamp}-${randomStr}`;

			const fallbackName = wodText.split('\n')[0]?.trim() || 'Untitled Workout';

			return {
				id: fallbackId,
				name: fallbackName,
				description: wodText || 'No description available',
				scope: 'private',
				scheme: 'time', // Default to time-based
				roundsToScore: 1,
				teamSpecificNotes: '## Stimulus & Strategy\n\nGeneral guidance: Focus on consistent pacing and proper form throughout the workout.',
				scalingGuidance: '## Scaling Options\n\n- **Beginner**: Reduce reps and loads as needed\n- **Intermediate**: Modify movements to appropriate skill level\n- **Advanced**: Perform as prescribed',
			};
		}
	}

	/**
	 * Legacy method for backward compatibility - analyzes WOD and returns analysis
	 */
	async analyzeWod(wodText: string): Promise<WodAnalysis> {
		logger.info('Starting WOD analysis');

		const prompt = `You are a CrossFit expert. Analyze the following workout (WOD) and provide a structured analysis.

WOD: ${wodText}

Please provide your analysis in the following JSON format:
{
	"summary": "Brief description of the workout",
	"movements": ["list", "of", "movements"],
	"difficulty": "beginner|intermediate|advanced",
	"estimatedTime": "estimated time to complete",
	"equipment": ["list", "of", "equipment", "needed"],
	"tags": ["descriptive", "tags", "about", "workout", "type"]
}

Only respond with valid JSON, no additional text.`;

		try {
			const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
				messages: [
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: 512,
				temperature: 0.3
			});

			logger.info('AI response received');

			// Handle the response properly based on Cloudflare Workers AI output
			let analysisText: string;
			if (typeof response === 'string') {
				analysisText = response;
			} else if (response && typeof response === 'object' && 'response' in response) {
				analysisText = (response as any).response || '';
			} else {
				analysisText = JSON.stringify(response);
			}

			// Clean the response text - remove markdown code blocks if present
			let cleanedAnalysisText = analysisText.trim();

			// Remove markdown code block markers if present
			if (cleanedAnalysisText.startsWith('```json')) {
				cleanedAnalysisText = cleanedAnalysisText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
			} else if (cleanedAnalysisText.startsWith('```')) {
				cleanedAnalysisText = cleanedAnalysisText.replace(/^```\s*/, '').replace(/\s*```$/, '');
			}

			const analysis = JSON.parse(cleanedAnalysisText) as WodAnalysis;

			logger.info('WOD analysis completed successfully');
			return analysis;
		} catch (error) {
			logger.error('Error analyzing WOD:', error);

			// Return a fallback analysis
			return {
				summary: 'Unable to analyze workout automatically',
				movements: [],
				difficulty: 'intermediate',
				estimatedTime: 'Unknown',
				equipment: [],
				tags: ['crossfit']
			};
		}
	}

	async generateWorkoutSuggestions(wodDetails: any): Promise<string[]> {
		logger.info('Generating workout suggestions');

		const prompt = `Based on this CrossFit workout, suggest 3 modifications or variations:

WOD: ${wodDetails.wodText || 'No workout details available'}

Provide 3 practical modifications (beginner, scaled, or advanced versions). Format as a simple list.`;

		try {
			const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
				messages: [
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: 256,
				temperature: 0.5
			});

			// Handle the response properly based on Cloudflare Workers AI output
			let suggestionsText: string;
			if (typeof response === 'string') {
				suggestionsText = response;
			} else if (response && typeof response === 'object' && 'response' in response) {
				suggestionsText = (response as any).response || 'No suggestions available';
			} else {
				suggestionsText = JSON.stringify(response);
			}

			return suggestionsText.split('\n').filter((s: string) => s.trim().length > 0).slice(0, 3);
		} catch (error) {
			logger.error('Error generating suggestions:', error);
			return ['Unable to generate suggestions at this time'];
		}
	}
}
