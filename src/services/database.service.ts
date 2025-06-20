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

export class DatabaseService {
	private dbConnection: DatabaseConnection;

	constructor(db: D1Database) {
		this.dbConnection = new DatabaseConnection(db);
		logger.info('Database service initialized');
	}

	/**
	 * Insert a new workout into the database
	 */
	async insertWorkout(workoutData: WorkoutInput): Promise<string> {
		try {
			const now = new Date();
			const workoutId = workoutData.id || `workout_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

			logger.debug('Inserting workout', { workoutId, name: workoutData.name });

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
				now,
				now,
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

			const now = new Date();
			const trackWorkoutId = `trwk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

			logger.debug('Adding workout to track', { 
				trackWorkoutId, 
				workoutId, 
				trackId, 
				dayNumber, 
				weekNumber 
			});

			const params = [
				trackWorkoutId,
				trackId,
				workoutId,
				dayNumber,
				weekNumber || null,
				notes || null,
				now,
				now,
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

			const now = new Date();
			const scheduledInstanceId = `swi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

			logger.debug('Scheduling workout instance', { 
				scheduledInstanceId, 
				trackWorkoutId, 
				teamId, 
				scheduledDate 
			});

			const params = [
				scheduledInstanceId,
				teamId,
				trackWorkoutId,
				scheduledDate,
				teamSpecificNotes || null,
				scalingGuidanceForDay || null,
				classTimes || null,
				now,
				now,
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
	 */
	async getScheduledWorkouts(teamId: string, date: Date): Promise<any[]> {
		try {
			logger.debug('Retrieving scheduled workouts', { teamId, date: date.toISOString() });

			const workouts = await this.dbConnection.executeQuery(
				queries.GET_SCHEDULED_WORKOUTS_BY_TEAM_AND_DATE, 
				[teamId, date]
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
				const now = new Date();
				
				switch (operation.type) {
					case 'insertWorkout': {
						const data = operation.data as WorkoutInput;
						const workoutId = data.id || `workout_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
						
						const params = [
							workoutId, data.name, data.description, data.scope || 'private', data.scheme,
							data.repsPerRound || null, data.roundsToScore || 1, data.userId || null,
							data.sugarId || null, data.tiebreakScheme || null, data.secondaryScheme || null,
							data.sourceTrackId || null, now, now, 0
						];
						
						statements.push({ sql: queries.INSERT_WORKOUT, params });
						results.push({ type: 'insertWorkout', id: workoutId });
						break;
					}
					
					case 'addWorkoutToTrack': {
						const data = operation.data as TrackWorkoutInput & { id?: string };
						const trackWorkoutId = data.id || `trwk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
						
						const params = [
							trackWorkoutId, data.trackId, data.workoutId, data.dayNumber,
							data.weekNumber || null, data.notes || null, now, now, 0
						];
						
						statements.push({ sql: queries.INSERT_TRACK_WORKOUT, params });
						results.push({ type: 'addWorkoutToTrack', id: trackWorkoutId });
						break;
					}
					
					case 'scheduleWorkout': {
						const data = operation.data as ScheduledWorkoutInstanceInput & { id?: string };
						const scheduledInstanceId = data.id || `swi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
						
						const params = [
							scheduledInstanceId, data.teamId, data.trackWorkoutId, data.scheduledDate,
							data.teamSpecificNotes || null, data.scalingGuidanceForDay || null,
							data.classTimes || null, now, now, 0
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
}
