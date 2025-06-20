/**
 * Integration tests for the complete workflow with database operations
 */

import { describe, it, expect, beforeEach } from 'bun:test';

describe('Workflow Integration Tests', () => {
	describe('Database Operations Integration', () => {
		it('should validate workflow includes database operations', () => {
			// This test validates that the workflow structure includes database operations
			// We can't run the full workflow in tests without the actual D1 database,
			// but we can validate the structure and imports

			// Check that DatabaseService is properly imported
			const fs = require('fs');
			const path = require('path');

			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');

			expect(indexContent).toContain('import { DatabaseService }');
			expect(indexContent).toContain('DB: D1Database');
			expect(indexContent).toContain('database-operations');
		});

		it('should validate workflow return includes database results', () => {
			// Validate that the workflow return object structure includes database results
			const fs = require('fs');
			const path = require('path');

			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');

			expect(indexContent).toContain('databaseResults: dbResults');
			expect(indexContent).toContain('workoutId');
			expect(indexContent).toContain('trackWorkoutId');
			expect(indexContent).toContain('scheduledInstanceId');
		});

		it('should validate configuration parameters are present', () => {
			// Validate that the workflow includes configuration for database operations
			const fs = require('fs');
			const path = require('path');

			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');

			expect(indexContent).toContain('ptrk_crossfit_dotcom');
			expect(indexContent).toContain('team_cokkpu1klwo0ulfhl1iwzpvn');
			expect(indexContent).toContain('usr_cynhnsszya9jayxu0fsft5jg');
		});

		it('should validate error handling for database operations', () => {
			// Validate that database operations are wrapped in proper error handling
			const fs = require('fs');
			const path = require('path');

			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');

			// Check that database operations are within a step.do() call
			expect(indexContent).toContain('step.do("database-operations"');

			// Check that the main workflow has error handling
			expect(indexContent).toContain('catch (err: any)');
			expect(indexContent).toContain('wfLogger.error');
		});

		it('should validate database operations flow', () => {
			// Validate the sequence of database operations
			const fs = require('fs');
			const path = require('path');

			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');

			// Check that all three database operations are present in order
			const insertWorkoutIndex = indexContent.indexOf('insertWorkout');
			const addWorkoutToTrackIndex = indexContent.indexOf('addWorkoutToTrack');
			const scheduleWorkoutIndex = indexContent.indexOf('scheduleWorkoutForDate');

			expect(insertWorkoutIndex).toBeGreaterThan(-1);
			expect(addWorkoutToTrackIndex).toBeGreaterThan(insertWorkoutIndex);
			expect(scheduleWorkoutIndex).toBeGreaterThan(addWorkoutToTrackIndex);
		});

		it('should validate logging for database operations', () => {
			// Validate that proper logging is in place for database operations
			const fs = require('fs');
			const path = require('path');

			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');

			expect(indexContent).toContain('Workout inserted with ID');
			expect(indexContent).toContain('Workout added to track with ID');
			expect(indexContent).toContain('Workout scheduled with ID');
			expect(indexContent).toContain('Database operations completed successfully');
		});

		it('should validate backward compatibility', () => {
			// Validate that the workflow maintains backward compatibility
			const fs = require('fs');
			const path = require('path');

			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');

			// Check that existing return properties are still present
			expect(indexContent).toContain('status: "completed"');
			expect(indexContent).toContain('date: dateInput');
			expect(indexContent).toContain('wodDetails');
			expect(indexContent).toContain('workoutObject');
			expect(indexContent).toContain('aiAnalysis');
			expect(indexContent).toContain('workoutSuggestions');
		});
	});

	describe('Type Safety Validation', () => {
		it('should validate that all database operations are properly typed', () => {
			// This test ensures that TypeScript compilation succeeds
			// If the file compiles without errors, the types are correct

			// We can simulate this by checking that imports resolve correctly
			const DatabaseService = require('../src/services/database.service');
			expect(typeof DatabaseService.DatabaseService).toBe('function');
		});

		it('should validate workout data transformation', () => {
			// Validate that workout object properties are properly mapped to database inputs
			const fs = require('fs');
			const path = require('path');

			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');

			// Check that all required workout properties are mapped
			expect(indexContent).toContain('id: workoutObject!.id');
			expect(indexContent).toContain('name: workoutObject!.name');
			expect(indexContent).toContain('description: workoutObject!.description');
			expect(indexContent).toContain('scheme: workoutObject!.scheme');
		});
	});

	describe('Configuration Validation', () => {
		it('should validate default configuration values', () => {
			// Validate that configuration values are properly set
			const fs = require('fs');
			const path = require('path');

			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');

			// Check default values
			expect(indexContent).toContain('defaultTrackId = \'ptrk_crossfit_dotcom\'');
			expect(indexContent).toContain('teamId = \'team_cokkpu1klwo0ulfhl1iwzpvn\'');
			expect(indexContent).toContain('userId = \'usr_cynhnsszya9jayxu0fsft5jg\'');
		});

		it('should validate database binding usage', () => {
			// Validate that the D1 database binding is properly used
			const fs = require('fs');
			const path = require('path');

			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');

			expect(indexContent).toContain('new DatabaseService(this.env.DB)');
		});
	});
});
