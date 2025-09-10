/**
 * Tests for database queries and D1 operations
 */

import { describe, it, expect } from 'bun:test';
import * as queries from '../src/db/queries';

describe('Database Queries', () => {
	describe('SQL Query Syntax', () => {
		it('should have valid INSERT_WORKOUT query', () => {
			expect(queries.INSERT_WORKOUT).toContain('INSERT INTO workouts');
			expect(queries.INSERT_WORKOUT).toContain('VALUES');
			// Count parameter placeholders
			const paramCount = (queries.INSERT_WORKOUT.match(/\?/g) || []).length;
			expect(paramCount).toBe(15); // All columns including timestamps and counter
		});

		it('should have valid GET_WORKOUT_BY_ID query', () => {
			expect(queries.GET_WORKOUT_BY_ID).toContain('SELECT * FROM workouts');
			expect(queries.GET_WORKOUT_BY_ID).toContain('WHERE id = ?');
		});

		it('should have valid INSERT_TRACK_WORKOUT query', () => {
			expect(queries.INSERT_TRACK_WORKOUT).toContain('INSERT INTO track_workout');
			const paramCount = (queries.INSERT_TRACK_WORKOUT.match(/\?/g) || []).length;
			expect(paramCount).toBe(9);
		});

		it('should have valid INSERT_SCHEDULED_WORKOUT_INSTANCE query', () => {
			expect(queries.INSERT_SCHEDULED_WORKOUT_INSTANCE).toContain('INSERT INTO scheduled_workout_instance');
			const paramCount = (queries.INSERT_SCHEDULED_WORKOUT_INSTANCE.match(/\?/g) || []).length;
			expect(paramCount).toBe(10);
		});

		it('should have valid GET_TRACK_WORKOUTS query with JOIN', () => {
			expect(queries.GET_TRACK_WORKOUTS).toContain('SELECT tw.*, w.name as workout_name');
			expect(queries.GET_TRACK_WORKOUTS).toContain('FROM track_workout tw');
			expect(queries.GET_TRACK_WORKOUTS).toContain('JOIN workouts w ON tw.workoutId = w.id');
			expect(queries.GET_TRACK_WORKOUTS).toContain('WHERE tw.trackId = ?');
		});

		it('should have valid GET_SCHEDULED_WORKOUTS_BY_TEAM_AND_DATE query', () => {
			expect(queries.GET_SCHEDULED_WORKOUTS_BY_TEAM_AND_DATE).toContain('SELECT swi.*');
			expect(queries.GET_SCHEDULED_WORKOUTS_BY_TEAM_AND_DATE).toContain('JOIN track_workout tw');
			expect(queries.GET_SCHEDULED_WORKOUTS_BY_TEAM_AND_DATE).toContain('JOIN workouts w');
			expect(queries.GET_SCHEDULED_WORKOUTS_BY_TEAM_AND_DATE).toContain('WHERE swi.teamId = ? AND DATE(swi.scheduledDate) = DATE(?)');
			const paramCount = (queries.GET_SCHEDULED_WORKOUTS_BY_TEAM_AND_DATE.match(/\?/g) || []).length;
			expect(paramCount).toBe(2);
		});

		it('should have valid utility queries', () => {
			expect(queries.CHECK_WORKOUT_EXISTS).toContain('SELECT COUNT(*) as count FROM workouts');
			expect(queries.CHECK_TRACK_EXISTS).toContain('SELECT COUNT(*) as count FROM programming_track');
			expect(queries.GET_NEXT_DAY_NUMBER_FOR_TRACK).toContain('SELECT COALESCE(MAX(dayNumber), 0) + 1');
		});
	});

	describe('Database Structure Validation', () => {
		it('should validate TypeScript interfaces match expected database structure', () => {
			// This test ensures our interfaces are properly structured
			const workoutColumns = [
				'id', 'name', 'description', 'scope', 'scheme', 'repsPerRound',
				'roundsToScore', 'userId', 'sugarId', 'tiebreakScheme', 'secondaryScheme',
				'sourceTrackId', 'createdAt', 'updatedAt', 'updateCounter'
			];

			const trackWorkoutColumns = [
				'id', 'trackId', 'workoutId', 'dayNumber', 'weekNumber', 'notes',
				'createdAt', 'updatedAt', 'updateCounter'
			];

			const scheduledWorkoutColumns = [
				'id', 'teamId', 'trackWorkoutId', 'scheduledDate', 'teamSpecificNotes',
				'scalingGuidanceForDay', 'classTimes', 'createdAt', 'updatedAt', 'updateCounter'
			];

			// Verify parameter counts match expected column counts
			expect((queries.INSERT_WORKOUT.match(/\?/g) || []).length).toBe(workoutColumns.length);
			expect((queries.INSERT_TRACK_WORKOUT.match(/\?/g) || []).length).toBe(trackWorkoutColumns.length);
			expect((queries.INSERT_SCHEDULED_WORKOUT_INSTANCE.match(/\?/g) || []).length).toBe(scheduledWorkoutColumns.length);
		});

		it('should have proper SQL keywords and syntax', () => {
			// Verify INSERT queries have proper structure
			expect(queries.INSERT_WORKOUT).toMatch(/INSERT INTO \w+ \(/);
			expect(queries.INSERT_TRACK_WORKOUT).toMatch(/INSERT INTO \w+ \(/);
			expect(queries.INSERT_SCHEDULED_WORKOUT_INSTANCE).toMatch(/INSERT INTO \w+ \(/);

			// Verify SELECT queries have proper structure
			expect(queries.GET_WORKOUT_BY_ID).toMatch(/SELECT .+ FROM \w+/);
			expect(queries.GET_TRACK_WORKOUTS).toMatch(/SELECT .+ FROM \w+/);
			expect(queries.GET_SCHEDULED_WORKOUTS_BY_TEAM_AND_DATE).toMatch(/SELECT .+ FROM \w+/);

			// Verify UPDATE queries have proper structure
			expect(queries.UPDATE_WORKOUT).toMatch(/UPDATE \w+ SET/);
			expect(queries.UPDATE_WORKOUT).toMatch(/WHERE id = \?/);
		});
	});
});
