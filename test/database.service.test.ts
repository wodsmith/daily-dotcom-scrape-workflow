/**
 * Tests for database service operations
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { DatabaseService } from '../src/services/database.service';
import { WorkoutInput, TrackWorkoutInput, ScheduledWorkoutInstanceInput } from '../src/db/types';

describe('DatabaseService', () => {
	let mockDb: any;
	let databaseService: DatabaseService;

	beforeEach(() => {
		// Mock D1Database
		mockDb = {
			prepare: mock(() => ({
				bind: mock(() => ({
					run: mock(() => Promise.resolve({ success: true, meta: { changes: 1, last_row_id: 123 } })),
					all: mock(() => Promise.resolve({ success: true, results: [] })),
					first: mock(() => Promise.resolve({ count: 1 }))
				}))
			})),
			batch: mock(() => Promise.resolve([
				{ success: true, meta: { changes: 1 } }
			]))
		};

		databaseService = new DatabaseService(mockDb);
	});

	describe('insertWorkout', () => {
		it('should insert workout with all required fields', async () => {
			const workoutData: WorkoutInput = {
				name: 'Test Workout',
				description: 'A test workout for validation',
				scheme: 'time',
				scope: 'public',
				roundsToScore: 1
			};

			const workoutId = await databaseService.insertWorkout(workoutData);

			expect(workoutId).toMatch(/^workout_\d+_[a-z0-9]{6}$/);
			expect(mockDb.prepare).toHaveBeenCalled();
		});

		it('should insert workout with custom ID', async () => {
			const workoutData: WorkoutInput = {
				id: 'custom-workout-123',
				name: 'Custom Workout',
				description: 'A workout with custom ID',
				scheme: 'rounds-reps'
			};

			const workoutId = await databaseService.insertWorkout(workoutData);

			expect(workoutId).toBe('custom-workout-123');
		});

		it('should handle workout with optional fields', async () => {
			const workoutData: WorkoutInput = {
				name: 'Complex Workout',
				description: 'A complex workout with many fields',
				scheme: 'time-with-cap',
				repsPerRound: 25,
				roundsToScore: 3,
				tiebreakScheme: 'reps',
				secondaryScheme: 'time',
				userId: 'user-123',
				sourceTrackId: 'track-456'
			};

			const workoutId = await databaseService.insertWorkout(workoutData);

			expect(workoutId).toBeDefined();
			expect(mockDb.prepare).toHaveBeenCalled();
		});
	});

	describe('addWorkoutToTrack', () => {
		it('should add workout to track with day number', async () => {
			// Mock successful existence checks
			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					first: mock(() => Promise.resolve({ count: 1 })),
					run: mock(() => Promise.resolve({ success: true, meta: { changes: 1 } }))
				}))
			}));

			const trackWorkoutId = await databaseService.addWorkoutToTrack(
				'workout-123',
				'track-456',
				5
			);

			expect(trackWorkoutId).toMatch(/^trwk_\d+_[a-z0-9]{6}$/);
			expect(mockDb.prepare).toHaveBeenCalled();
		});

		it('should add workout to track with week number and notes', async () => {
			// Mock successful existence checks
			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					first: mock(() => Promise.resolve({ count: 1 })),
					run: mock(() => Promise.resolve({ success: true, meta: { changes: 1 } }))
				}))
			}));

			const trackWorkoutId = await databaseService.addWorkoutToTrack(
				'workout-123',
				'track-456',
				10,
				2,
				'Week 2 intensity focus'
			);

			expect(trackWorkoutId).toMatch(/^trwk_\d+_[a-z0-9]{6}$/);
		});

		it('should throw error when workout does not exist', async () => {
			// Mock workout not found
			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					first: mock(() => Promise.resolve({ count: 0 }))
				}))
			}));

			await expect(
				databaseService.addWorkoutToTrack('nonexistent-workout', 'track-456', 1)
			).rejects.toThrow('Workout nonexistent-workout does not exist');
		});

		it('should throw error when track does not exist', async () => {
			// Mock workout exists but track doesn't
			let callCount = 0;
			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					first: mock(() => {
						callCount++;
						if (callCount === 1) {
							return Promise.resolve({ count: 1 }); // Workout exists
						} else {
							return Promise.resolve({ count: 0 }); // Track doesn't exist
						}
					})
				}))
			}));

			await expect(
				databaseService.addWorkoutToTrack('workout-123', 'nonexistent-track', 1)
			).rejects.toThrow('Programming track nonexistent-track does not exist');
		});
	});

	describe('scheduleWorkoutForDate', () => {
		it('should schedule workout for team and date', async () => {
			// Mock successful track workout existence check
			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					first: mock(() => Promise.resolve({ id: 'trwk-123' })),
					run: mock(() => Promise.resolve({ success: true, meta: { changes: 1 } }))
				}))
			}));

			const scheduledDate = new Date('2025-06-21');
			const scheduledInstanceId = await databaseService.scheduleWorkoutForDate(
				'trwk-123',
				'team-456',
				scheduledDate
			);

			expect(scheduledInstanceId).toMatch(/^swi_\d+_[a-z0-9]{6}$/);
			expect(mockDb.prepare).toHaveBeenCalled();
		});

		it('should schedule workout with team notes and scaling guidance', async () => {
			// Mock successful track workout existence check
			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					first: mock(() => Promise.resolve({ id: 'trwk-123' })),
					run: mock(() => Promise.resolve({ success: true, meta: { changes: 1 } }))
				}))
			}));

			const scheduledDate = new Date('2025-06-21');
			const scheduledInstanceId = await databaseService.scheduleWorkoutForDate(
				'trwk-123',
				'team-456',
				scheduledDate,
				'Focus on form over speed',
				'Scale pull-ups to ring rows for beginners',
				'6:00 AM, 7:00 AM, 5:30 PM'
			);

			expect(scheduledInstanceId).toMatch(/^swi_\d+_[a-z0-9]{6}$/);
		});

		it('should throw error when track workout does not exist', async () => {
			// Mock track workout not found
			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					first: mock(() => Promise.resolve(null))
				}))
			}));

			const scheduledDate = new Date('2025-06-21');
			await expect(
				databaseService.scheduleWorkoutForDate('nonexistent-trwk', 'team-456', scheduledDate)
			).rejects.toThrow('Track workout nonexistent-trwk does not exist');
		});
	});

	describe('getTrackWorkouts', () => {
		it('should retrieve workouts for a track', async () => {
			const mockWorkouts = [
				{ id: 'trwk-1', workoutId: 'workout-1', dayNumber: 1, workout_name: 'Workout 1' },
				{ id: 'trwk-2', workoutId: 'workout-2', dayNumber: 2, workout_name: 'Workout 2' }
			];

			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					all: mock(() => Promise.resolve({ success: true, results: mockWorkouts }))
				}))
			}));

			const workouts = await databaseService.getTrackWorkouts('track-123');

			expect(workouts).toEqual(mockWorkouts);
			expect(workouts.length).toBe(2);
		});

		it('should return empty array when no workouts found', async () => {
			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					all: mock(() => Promise.resolve({ success: true, results: [] }))
				}))
			}));

			const workouts = await databaseService.getTrackWorkouts('empty-track');

			expect(workouts).toEqual([]);
			expect(workouts.length).toBe(0);
		});
	});

	describe('getNextDayNumberForTrack', () => {
		it('should return next day number for track with existing workouts', async () => {
			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					first: mock(() => Promise.resolve({ nextDayNumber: 6 }))
				}))
			}));

			const dayNumber = await databaseService.getNextDayNumberForTrack('track-123');

			expect(dayNumber).toBe(6);
		});

		it('should return 1 for track with no existing workouts', async () => {
			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					first: mock(() => Promise.resolve({ nextDayNumber: 1 }))
				}))
			}));

			const dayNumber = await databaseService.getNextDayNumberForTrack('empty-track');

			expect(dayNumber).toBe(1);
		});

		it('should return 1 when query returns null', async () => {
			mockDb.prepare = mock(() => ({
				bind: mock(() => ({
					first: mock(() => Promise.resolve(null))
				}))
			}));

			const dayNumber = await databaseService.getNextDayNumberForTrack('track-123');

			expect(dayNumber).toBe(1);
		});
	});

	describe('executeTransaction', () => {
		it('should execute multiple operations in transaction', async () => {
			mockDb.batch = mock(() => Promise.resolve([
				{ success: true, meta: { changes: 1 } },
				{ success: true, meta: { changes: 1 } },
				{ success: true, meta: { changes: 1 } }
			]));

			const operations = [
				{
					type: 'insertWorkout' as const,
					data: {
						name: 'Transaction Workout',
						description: 'Workout created in transaction',
						scheme: 'time' as const
					}
				},
				{
					type: 'addWorkoutToTrack' as const,
					data: {
						trackId: 'track-123',
						workoutId: 'workout-123',
						dayNumber: 1
					}
				},
				{
					type: 'scheduleWorkout' as const,
					data: {
						teamId: 'team-456',
						trackWorkoutId: 'trwk-123',
						scheduledDate: new Date('2025-06-21')
					}
				}
			];

			const results = await databaseService.executeTransaction(operations);

			expect(results).toHaveLength(3);
			expect(results[0].type).toBe('insertWorkout');
			expect(results[1].type).toBe('addWorkoutToTrack');
			expect(results[2].type).toBe('scheduleWorkout');
			expect(mockDb.batch).toHaveBeenCalled();
		});

		it('should handle transaction failure', async () => {
			mockDb.batch = mock(() => Promise.resolve([
				{ success: true, meta: { changes: 1 } },
				{ success: false, error: 'Constraint violation' }
			]));

			const operations = [
				{
					type: 'insertWorkout' as const,
					data: {
						name: 'Failed Transaction Workout',
						description: 'This should fail',
						scheme: 'time' as const
					}
				},
				{
					type: 'addWorkoutToTrack' as const,
					data: {
						trackId: 'invalid-track',
						workoutId: 'workout-123',
						dayNumber: 1
					}
				}
			];

			await expect(
				databaseService.executeTransaction(operations)
			).rejects.toThrow('Transaction failed: Constraint violation');
		});
	});
});
