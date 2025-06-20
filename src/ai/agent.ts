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

		const prompt = `You are a CrossFit expert. Analyze the following workout (WOD) and provide a structured workout object.

WOD: ${wodText}

Please analyze this workout and provide a JSON object with the following structure:
{
	"id": "unique-workout-slug",
	"name": "Clear workout name/title",
	"description": "Detailed description of the workout",
	"scope": "private",
	"scheme": "primary_scoring_scheme",
	"repsPerRound": number_or_null,
	"roundsToScore": number_default_1,
	"tiebreakScheme": "time_or_reps_or_null",
	"secondaryScheme": "secondary_scheme_or_null"
}

For the scheme field, choose from:
- "time" for time-based workouts (finish as fast as possible)
- "time-with-cap" for time workouts with a time cap
- "rounds-reps" for AMRAP (As Many Rounds As Possible)
- "reps" for max reps in a given time
- "emom" for Every Minute On the Minute
- "load" for max weight/load
- "calories", "meters", "feet" for distance/calorie based
- "points" for point-based scoring
- "pass-fail" for completion-based workouts

Guidelines:
- Generate a descriptive slug ID based on the workout content
- Extract or create a clear workout name
- Provide detailed description including movements and structure
- Choose the most appropriate primary scheme
- Set repsPerRound if it's a rounds-based workout
- Set roundsToScore (usually 1 for most workouts, higher for multi-round scoring)
- Include tiebreakScheme only if there's a clear tiebreaker
- Include secondaryScheme only if there's a secondary scoring component

Only respond with valid JSON, no additional text.`;

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

			// Parse and validate the response
			const workoutData = JSON.parse(workoutText);

			// Validate against our schema using zod
			const validatedWorkout = WorkoutSchema.parse(workoutData);

			logger.info('Structured workout object generated and validated successfully');
			return validatedWorkout;
		} catch (error) {
			logger.error('Error generating workout object:', error);

			// Generate a fallback workout object with basic info extracted from the text
			const fallbackId = wodText
				.toLowerCase()
				.replace(/[^a-z0-9\s]/g, '')
				.trim()
				.split(/\s+/)
				.slice(0, 3)
				.join('-') || `workout-${Date.now()}`;

			const fallbackName = wodText.split('\n')[0]?.trim() || 'Untitled Workout';

			return {
				id: fallbackId,
				name: fallbackName,
				description: wodText || 'No description available',
				scope: 'private',
				scheme: 'time', // Default to time-based
				roundsToScore: 1,
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

			const analysis = JSON.parse(analysisText) as WodAnalysis;

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
