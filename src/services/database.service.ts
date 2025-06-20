/**
 * Database service for workout and programming track operations
 * Provides methods for inserting workouts, managing tracks, and scheduling instances
 */

import { DatabaseConnection } from '../db/database';
import {
	WorkoutInput,
	TrackWorkoutInput,
	ScheduledWorkoutInstanceInput,
	Workout,
	TrackWorkout,
	ScheduledWorkoutInstance
} from '../db/types';
import * as queries from '../db/queries';
import { logger } from '../utils/logger';
import {
	dateToUnixTimestamp,
	getCurrentPacificDate,
	getCurrentPacificDateString,
	createPacificDate,
	getStartOfDayPacific
} from '../utils/date-utils';

export class DatabaseService {
	private dbConnection: DatabaseConnection;

	constructor(db: D1Database) {
		this.dbConnection = new DatabaseConnection(db);
		logger.info('Database service initialized');
	}

	/**
	 * Generate a unique workout ID with better collision resistance
	 */
	private generateWorkoutId(): string {
		const timestamp = Date.now().toString(36);
		const randomStr = Math.random().toString(36).substring(2, 12);
		const counter = Math.floor(Math.random() * 10000).toString(36);
		return `workout_${timestamp}_${randomStr}_${counter}`;
	}

	/**
	 * Generate a unique track workout ID
	 */
	private generateTrackWorkoutId(): string {
		const timestamp = Date.now().toString(36);
		const randomStr = Math.random().toString(36).substring(2, 12);
		const counter = Math.floor(Math.random() * 10000).toString(36);
		return `trwk_${timestamp}_${randomStr}_${counter}`;
	}

	/**
	 * Generate a unique scheduled workout instance ID
	 */
	private generateScheduledInstanceId(): string {
		const timestamp = Date.now().toString(36);
		const randomStr = Math.random().toString(36).substring(2, 12);
		const counter = Math.floor(Math.random() * 10000).toString(36);
		return `swi_${timestamp}_${randomStr}_${counter}`;
	}

	/**
	 * Check if a workout with the given ID already exists
	 */
	private async workoutExists(workoutId: string): Promise<boolean> {
		try {
			const result = await this.dbConnection.executeQueryFirst<{ count: number }>(
				queries.CHECK_WORKOUT_EXISTS,
				[workoutId]
			);
			return (result?.count || 0) > 0;
		} catch (error) {
			logger.error('Error checking workout existence', { workoutId, error });
			return false;
		}
	}

	/**
	 * Insert a new workout into the database
	 */
	async insertWorkout(workoutData: WorkoutInput): Promise<string> {
		try {
			const now = getCurrentPacificDate(); // Use Pacific Time for consistent timestamp handling
			const nowTimestamp = dateToUnixTimestamp(now);
			
			// Generate or use provided workout ID
			let workoutId = workoutData.id;
			if (!workoutId) {
				// Generate a unique ID and ensure it doesn't already exist
				do {
					workoutId = this.generateWorkoutId();
				} while (await this.workoutExists(workoutId));
			} else {
				// If ID is provided, check if it already exists
				if (await this.workoutExists(workoutId)) {
					throw new Error(`Workout with ID ${workoutId} already exists`);
				}
			}

			logger.debug('Inserting workout', {
				workoutId,
				name: workoutData.name,
				createdAtPacific: now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
				createdAtTimestamp: nowTimestamp
			});

			const params = [
				workoutId,
				workoutData.name,
				workoutData.description,
				workoutData.scope || 'private',
				workoutData.scheme,
				workoutData.repsPerRound || null,
				workoutData.roundsToScore || 1,
				workoutData.userId || null,
				workoutData.sugarId || null,
				workoutData.tiebreakScheme || null,
				workoutData.secondaryScheme || null,
				workoutData.sourceTrackId || null,
				nowTimestamp,
				nowTimestamp,
				0
			];

			const result = await this.dbConnection.executeStatement(queries.INSERT_WORKOUT, params);

			if (result.success) {
				logger.info('Workout inserted successfully', { workoutId });
				return workoutId;
			} else {
				throw new Error(`Failed to insert workout: ${result.error}`);
			}
		} catch (error) {
			logger.error('Error inserting workout', { workoutData, error });
			throw error;
		}
	}

	/**
	 * Add a workout to a programming track
	 */
	async addWorkoutToTrack(
		workoutId: string,
		trackId: string,
		dayNumber: number,
		weekNumber?: number,
		notes?: string
	): Promise<string> {
		try {
			// Verify workout exists
			const workoutExists = await this.dbConnection.executeQueryFirst<{ count: number }>(
				queries.CHECK_WORKOUT_EXISTS,
				[workoutId]
			);

			if (!workoutExists || workoutExists.count === 0) {
				throw new Error(`Workout ${workoutId} does not exist`);
			}

			// Verify track exists
			const trackExists = await this.dbConnection.executeQueryFirst<{ count: number }>(
				queries.CHECK_TRACK_EXISTS,
				[trackId]
			);

			if (!trackExists || trackExists.count === 0) {
				throw new Error(`Programming track ${trackId} does not exist`);
			}

			const now = getCurrentPacificDate(); // Use Pacific Time for consistent timestamp handling
			const nowTimestamp = dateToUnixTimestamp(now);
			const trackWorkoutId = this.generateTrackWorkoutId();

			logger.debug('Adding workout to track', {
				trackWorkoutId,
				workoutId,
				trackId,
				dayNumber,
				weekNumber,
				createdAtPacific: now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
			});

			const params = [
				trackWorkoutId,
				trackId,
				workoutId,
				dayNumber,
				weekNumber || null,
				notes || null,
				nowTimestamp,
				nowTimestamp,
				0
			];

			const result = await this.dbConnection.executeStatement(queries.INSERT_TRACK_WORKOUT, params);

			if (result.success) {
				logger.info('Workout added to track successfully', { trackWorkoutId, trackId, workoutId });
				return trackWorkoutId;
			} else {
				throw new Error(`Failed to add workout to track: ${result.error}`);
			}
		} catch (error) {
			logger.error('Error adding workout to track', { workoutId, trackId, dayNumber, error });
			throw error;
		}
	}

	/**
	 * Schedule a workout for a specific date and team
	 */
	async scheduleWorkoutForDate(
		trackWorkoutId: string,
		teamId: string,
		scheduledDate: Date,
		teamSpecificNotes?: string,
		scalingGuidanceForDay?: string,
		classTimes?: string
	): Promise<string> {
		try {
			// Verify track workout exists
			const trackWorkoutExists = await this.dbConnection.executeQueryFirst<{ id: string }>(
				queries.GET_TRACK_WORKOUT_BY_ID,
				[trackWorkoutId]
			);

			if (!trackWorkoutExists) {
				throw new Error(`Track workout ${trackWorkoutId} does not exist`);
			}

			const now = getCurrentPacificDate(); // Use Pacific Time for consistent timestamp handling
			const nowTimestamp = dateToUnixTimestamp(now);
			const scheduledInstanceId = this.generateScheduledInstanceId();

			logger.debug('Scheduling workout instance', {
				scheduledInstanceId,
				trackWorkoutId,
				teamId,
				scheduledDate,
				scheduledDatePacific: scheduledDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
				scheduledDateUTC: scheduledDate.toISOString(),
				scheduledDateTimestamp: dateToUnixTimestamp(scheduledDate),
				createdAtPacific: now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
			});

			const params = [
				scheduledInstanceId,
				teamId,
				trackWorkoutId,
				dateToUnixTimestamp(scheduledDate), // Use utility function for date conversion
				teamSpecificNotes || null,
				scalingGuidanceForDay || null,
				classTimes || null,
				nowTimestamp,
				nowTimestamp,
				0
			];

			const result = await this.dbConnection.executeStatement(queries.INSERT_SCHEDULED_WORKOUT_INSTANCE, params);

			if (result.success) {
				logger.info('Workout scheduled successfully', {
					scheduledInstanceId,
					teamId,
					scheduledDate: scheduledDate.toISOString()
				});
				return scheduledInstanceId;
			} else {
				throw new Error(`Failed to schedule workout: ${result.error}`);
			}
		} catch (error) {
			logger.error('Error scheduling workout', { trackWorkoutId, teamId, scheduledDate, error });
			throw error;
		}
	}

	/**
	 * Get all workouts for a programming track
	 */
	async getTrackWorkouts(trackId: string): Promise<any[]> {
		try {
			logger.debug('Retrieving track workouts', { trackId });

			const workouts = await this.dbConnection.executeQuery(queries.GET_TRACK_WORKOUTS, [trackId]);

			logger.debug('Track workouts retrieved', { trackId, count: workouts.length });
			return workouts;
		} catch (error) {
			logger.error('Error retrieving track workouts', { trackId, error });
			throw error;
		}
	}

	/**
	 * Get scheduled workouts for a team on a specific date
	 * Date should be in Pacific Time for proper filtering
	 */
	async getScheduledWorkouts(teamId: string, date: Date): Promise<any[]> {
		try {
			// Ensure we're working with Pacific Time for consistent date filtering
			const pacificStartOfDay = getStartOfDayPacific(date);
			const dateTimestamp = dateToUnixTimestamp(pacificStartOfDay);

			logger.debug('Retrieving scheduled workouts', {
				teamId,
				requestedDate: date.toISOString(),
				pacificStartOfDay: pacificStartOfDay.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
				dateTimestamp
			});

			const workouts = await this.dbConnection.executeQuery(
				queries.GET_SCHEDULED_WORKOUTS_BY_TEAM_AND_DATE,
				[teamId, dateTimestamp]
			);

			logger.debug('Scheduled workouts retrieved', { teamId, count: workouts.length });
			return workouts;
		} catch (error) {
			logger.error('Error retrieving scheduled workouts', { teamId, date, error });
			throw error;
		}
	}

	/**
	 * Get the next available day number for a track
	 */
	async getNextDayNumberForTrack(trackId: string): Promise<number> {
		try {
			logger.debug('Getting next day number for track', { trackId });

			const result = await this.dbConnection.executeQueryFirst<{ nextDayNumber: number }>(
				queries.GET_NEXT_DAY_NUMBER_FOR_TRACK,
				[trackId]
			);

			const nextDayNumber = result?.nextDayNumber || 1;
			logger.debug('Next day number retrieved', { trackId, nextDayNumber });
			return nextDayNumber;
		} catch (error) {
			logger.error('Error getting next day number', { trackId, error });
			throw error;
		}
	}

	/**
	 * Execute multiple database operations in a transaction
	 */
	async executeTransaction(operations: Array<{
		type: 'insertWorkout' | 'addWorkoutToTrack' | 'scheduleWorkout';
		data: any;
	}>): Promise<any[]> {
		try {
			logger.debug('Executing transaction', { operationCount: operations.length });

			const statements: { sql: string; params: any[] }[] = [];
			const results: any[] = [];

			// Prepare all statements
			for (const operation of operations) {
				const now = getCurrentPacificDate(); // Use Pacific Time for consistent timestamp handling
				const nowTimestamp = dateToUnixTimestamp(now);

				switch (operation.type) {
					case 'insertWorkout': {
						const data = operation.data as WorkoutInput;
						let workoutId = data.id;
						if (!workoutId) {
							// Generate a unique ID for transaction
							do {
								workoutId = this.generateWorkoutId();
							} while (await this.workoutExists(workoutId));
						}

						// Check for ID collision and regenerate if necessary
						let finalWorkoutId = workoutId;
						let attempt = 0;
						while (await this.workoutExists(finalWorkoutId) && attempt < 5) {
							attempt++;
							finalWorkoutId = `${workoutId}_${attempt}`;
						}

						const params = [
							finalWorkoutId, data.name, data.description, data.scope || 'private', data.scheme,
							data.repsPerRound || null, data.roundsToScore || 1, data.userId || null,
							data.sugarId || null, data.tiebreakScheme || null, data.secondaryScheme || null,
							data.sourceTrackId || null, nowTimestamp, nowTimestamp, 0
						];

						statements.push({ sql: queries.INSERT_WORKOUT, params });
						results.push({ type: 'insertWorkout', id: finalWorkoutId });
						break;
					}

					case 'addWorkoutToTrack': {
						const data = operation.data as TrackWorkoutInput & { id?: string };
						const trackWorkoutId = data.id || this.generateTrackWorkoutId();

						const params = [
							trackWorkoutId, data.trackId, data.workoutId, data.dayNumber,
							data.weekNumber || null, data.notes || null, nowTimestamp, nowTimestamp, 0
						];

						statements.push({ sql: queries.INSERT_TRACK_WORKOUT, params });
						results.push({ type: 'addWorkoutToTrack', id: trackWorkoutId });
						break;
					}

					case 'scheduleWorkout': {
						const data = operation.data as ScheduledWorkoutInstanceInput & { id?: string };
						const scheduledInstanceId = data.id || this.generateScheduledInstanceId();

						// Convert scheduledDate to Unix timestamp if it's a Date object
						const scheduledDateTimestamp = data.scheduledDate instanceof Date
							? dateToUnixTimestamp(data.scheduledDate)
							: data.scheduledDate;

						const params = [
							scheduledInstanceId, data.teamId, data.trackWorkoutId, scheduledDateTimestamp,
							data.teamSpecificNotes || null, data.scalingGuidanceForDay || null,
							data.classTimes || null, nowTimestamp, nowTimestamp, 0
						];

						statements.push({ sql: queries.INSERT_SCHEDULED_WORKOUT_INSTANCE, params });
						results.push({ type: 'scheduleWorkout', id: scheduledInstanceId });
						break;
					}
				}
			}

			// Execute batch transaction
			const batchResults = await this.dbConnection.executeBatch(statements);

			// Verify all operations succeeded
			const failedOperations = batchResults.filter(result => !result.success);
			if (failedOperations.length > 0) {
				throw new Error(`Transaction failed: ${failedOperations.map(r => r.error).join(', ')}`);
			}

			logger.info('Transaction completed successfully', {
				operationCount: operations.length,
				results: results.map(r => ({ type: r.type, id: r.id }))
			});

			return results;
		} catch (error) {
			logger.error('Transaction failed', { operationCount: operations.length, error });
			throw error;
		}
	}

	/**
	 * Get scheduled workouts for today (Pacific Time)
	 */
	async getTodaysScheduledWorkouts(teamId: string): Promise<any[]> {
		const today = getCurrentPacificDate();
		return this.getScheduledWorkouts(teamId, today);
	}

	/**
	 * Schedule a workout for today (Pacific Time)
	 */
	async scheduleWorkoutForToday(
		trackWorkoutId: string,
		teamId: string,
		teamSpecificNotes?: string,
		scalingGuidanceForDay?: string,
		classTimes?: string
	): Promise<string> {
		const today = getCurrentPacificDate();
		return this.scheduleWorkoutForDate(
			trackWorkoutId,
			teamId,
			today,
			teamSpecificNotes,
			scalingGuidanceForDay,
			classTimes
		);
	}

	/**
	 * Schedule a workout for a specific Pacific Time date string (YYYY-MM-DD)
	 */
	async scheduleWorkoutForPacificDate(
		trackWorkoutId: string,
		teamId: string,
		dateString: string,
		teamSpecificNotes?: string,
		scalingGuidanceForDay?: string,
		classTimes?: string
	): Promise<string> {
		const date = createPacificDate(dateString);
		return this.scheduleWorkoutForDate(
			trackWorkoutId,
			teamId,
			date,
			teamSpecificNotes,
			scalingGuidanceForDay,
			classTimes
		);
	}
}
