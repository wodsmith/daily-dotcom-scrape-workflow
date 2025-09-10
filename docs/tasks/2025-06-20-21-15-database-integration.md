# Task: Database Integration for Structured Workout Objects

## Commit 1: feat: add D1 database binding and raw SQL setup [docs/tasks/2025-06-20-21-15-database-integration.md]

**Description:**
Configure D1 database binding in the Cloudflare Workers environment and set up raw SQL queries for database operations. This involves adding the D1 binding to `wrangler.jsonc`, creating a database utilities file at `src/db/queries.ts` with prepared SQL statements for inserting workouts, managing track associations, and scheduling workout instances. Create TypeScript interfaces at `src/db/types.ts` that match the existing schema structure for type safety. Set up a database connection utility at `src/db/database.ts` that provides a clean interface for executing the raw SQL queries using D1's prepared statement API. This approach avoids schema duplication while maintaining type safety through interfaces.

**Schema files**:

```javascript
const commonColumns = {
	createdAt: integer({
		mode: 'timestamp',
	})
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer({
		mode: 'timestamp',
	})
		.$onUpdateFn(() => new Date())
		.notNull(),
	updateCounter: integer()
		.default(0)
		.$onUpdate(() => sql`updateCounter + 1`),
};

export const workouts = sqliteTable('workouts', {
	...commonColumns,
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	scope: text('scope', {
		enum: ['private', 'public'],
	})
		.default('private')
		.notNull(),
	scheme: text('scheme', {
		enum: ['time', 'time-with-cap', 'pass-fail', 'rounds-reps', 'reps', 'emom', 'load', 'calories', 'meters', 'feet', 'points'],
	}).notNull(),
	repsPerRound: integer('reps_per_round'),
	roundsToScore: integer('rounds_to_score').default(1),
	userId: text('user_id').references(() => userTable.id),
	sugarId: text('sugar_id'),
	tiebreakScheme: text('tiebreak_scheme', { enum: ['time', 'reps'] }),
	secondaryScheme: text('secondary_scheme', {
		enum: ['time', 'pass-fail', 'rounds-reps', 'reps', 'emom', 'load', 'calories', 'meters', 'feet', 'points'],
	}),
	sourceTrackId: text('source_track_id').references(() => programmingTracksTable.id),
});

export const programmingTracksTable = sqliteTable(
	'programming_track',
	{
		...commonColumns,
		id: text()
			.primaryKey()
			.$defaultFn(() => `ptrk_${createId()}`)
			.notNull(),
		name: text({ length: 255 }).notNull(),
		description: text({ length: 1000 }),
		type: text({ enum: programmingTrackTypeTuple }).notNull(),
		ownerTeamId: text().references(() => teamTable.id),
		isPublic: integer().default(0).notNull(),
	},
	(table) => [index('programming_track_type_idx').on(table.type), index('programming_track_owner_idx').on(table.ownerTeamId)]
);

export const trackWorkoutsTable = sqliteTable(
	'track_workout',
	{
		...commonColumns,
		id: text()
			.primaryKey()
			.$defaultFn(() => `trwk_${createId()}`)
			.notNull(),
		trackId: text()
			.notNull()
			.references(() => programmingTracksTable.id),
		workoutId: text()
			.notNull()
			.references(() => workouts.id),
		dayNumber: integer().notNull(),
		weekNumber: integer(),
		notes: text({ length: 1000 }),
	},
	(table) => [
		index('track_workout_track_idx').on(table.trackId),
		index('track_workout_day_idx').on(table.dayNumber),
		index('track_workout_workoutid_idx').on(table.workoutId),
		index('track_workout_unique_idx').on(table.trackId, table.workoutId, table.dayNumber),
	]
);

export const scheduledWorkoutInstancesTable = sqliteTable(
	'scheduled_workout_instance',
	{
		...commonColumns,
		id: text()
			.primaryKey()
			.$defaultFn(() => `swi_${createId()}`)
			.notNull(),
		teamId: text()
			.notNull()
			.references(() => teamTable.id),
		trackWorkoutId: text()
			.notNull()
			.references(() => trackWorkoutsTable.id),
		scheduledDate: integer({ mode: 'timestamp' }).notNull(),
		teamSpecificNotes: text({ length: 1000 }),
		scalingGuidanceForDay: text({ length: 1000 }),
		classTimes: text({ length: 500 }), // JSON string or comma-separated times
	},
	(table) => [
		index('scheduled_workout_instance_team_idx').on(table.teamId),
		index('scheduled_workout_instance_date_idx').on(table.scheduledDate),
	]
);

export const teamProgrammingTracksTable = sqliteTable(
	'team_programming_track',
	{
		...commonColumns,
		teamId: text()
			.notNull()
			.references(() => teamTable.id),
		trackId: text()
			.notNull()
			.references(() => programmingTracksTable.id),
		isActive: integer().default(1).notNull(),
		addedAt: integer({ mode: 'timestamp' })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.teamId, table.trackId] }), index('team_programming_track_active_idx').on(table.isActive)]
);
```

**Verification:**

1. **Automated Test(s):**
   - **Command:** `pnpm test src/db/queries.test.ts`
   - **Expected Outcome:** Asserts that SQL queries are syntactically correct, TypeScript interfaces match expected database structure, and D1 prepared statements execute without errors
2. **Logging Check:**
   - **Action:** Initialize database utilities and test query preparation
   - **Expected Log:** `INFO: Database utilities initialized successfully with D1 binding, DEBUG: Prepared 5 SQL statements for workout operations`
   - **Toggle Mechanism:** `LOG_LEVEL=debug`

---

## Commit 2: feat: implement database service with raw SQL operations [docs/tasks/2025-06-20-21-15-database-integration.md]

**Description:**
Create a comprehensive database service at `src/services/database.service.ts` that provides methods for inserting workouts, managing programming tracks, creating track-workout associations, and scheduling workout instances using raw SQL queries. The service will include methods: `insertWorkout(workoutData)`, `addWorkoutToTrack(workoutId, trackId, dayNumber, weekNumber?)`, `scheduleWorkoutForDate(trackWorkoutId, teamId, scheduledDate)`, and `getTrackWorkouts(trackId)`. Each method will use D1's prepared statement API with raw SQL for type-safe database operations, proper error handling, transaction support using D1's batch API where needed, and detailed logging for all database operations. The service will leverage the SQL queries and TypeScript interfaces created in commit 1 for maintainable and type-safe database interactions.

**Verification:**

1. **Automated Test(s):**
   - **Command:** `pnpm test src/services/database.service.test.ts`
   - **Expected Outcome:** Unit tests verify all CRUD operations using mock D1 database, transaction handling via batch operations, error scenarios, and return correct typed results matching the interface definitions
2. **Logging Check:**
   - **Action:** Execute database operations in test environment with various scenarios
   - **Expected Log:** `INFO: Workout inserted successfully with ID: workout-123, DEBUG: Executing SQL: INSERT INTO workouts VALUES (?...), trackId=ptrk_abc123, dayNumber=1`
   - **Toggle Mechanism:** `LOG_LEVEL=debug`

---

## Commit 3: feat: integrate database operations into workflow [docs/tasks/2025-06-20-21-15-database-integration.md]

**Description:**
Modify the main workflow at `src/index.ts` to integrate database operations after successful workout object generation. Add D1 database binding to the `Env` interface as `DB: D1Database`, import the database service, and add workflow steps for: inserting the generated workout object into the database, adding the workout to a specified programming track (configurable via environment variable or workflow parameters), and scheduling the workout for the current date. The workflow will include proper error handling for database operations and will maintain backward compatibility with existing functionality. Update the workflow return object to include database operation results and newly created record IDs.

**Verification:**

1. **Automated Test(s):**
   - **Command:** `pnpm test src/index.test.ts`
   - **Expected Outcome:** Integration tests verify complete workflow execution including database operations, proper error handling, and correct data persistence across all tables
2. **Logging Check:**
   - **Action:** Execute full workflow with mock WOD data and verify database operations
   - **Expected Log:** `INFO: Workout database operations completed successfully, workoutId: workout-123, trackWorkoutId: trwk_456, scheduledInstanceId: swi_789`
   - **Toggle Mechanism:** `LOG_LEVEL=info`

---

## Commit 4: feat: add configuration and environment setup [docs/tasks/2025-06-20-21-15-database-integration.md]

**Description:**
Update the Cloudflare Workers configuration to include D1 database binding, add environment variables for database operations, and configure the TypeScript environment. Modify `wrangler.jsonc` to include the D1 database binding configuration, update `worker-configuration.d.ts` to include the D1Database type in the Env interface, and add environment variables for default programming track ID, team ID, and other configurable parameters. Create environment-specific configuration files and update the package.json scripts to include database-related commands. Since we're using raw SQL instead of an ORM, no additional dependencies like drizzle-kit are needed. Ensure the configuration supports both development and production environments with appropriate database bindings.

**data:**:
```json
{
	"bindings": [
		{
			"type": "d1_database",
			"name": "DB",
			"database_name": "wodsmith-db",
			"database_id": "931185e9-99e5-48f0-bf70-d03ca5936f2d"
		}
	],
	"env": {
		"DEFAULT_TRACK_ID": "ptrk_crossfit_dotcom",
		"TEAM_ID": "team_cokkpu1klwo0ulfhl1iwzpvn"
		"USER_ID": "usr_cynhnsszya9jayxu0fsft5jg"
	}
}
```


**Verification:**

1. **Automated Test(s):**
   - **Command:** `pnpm run build && pnpm run test:config`
   - **Expected Outcome:** Build succeeds with proper TypeScript types, configuration validates correctly, D1 binding is properly typed and accessible, and no unnecessary ORM dependencies are included
2. **Logging Check:**
   - **Action:** Deploy to development environment and verify all bindings are available
   - **Expected Log:** `INFO: Environment configuration loaded successfully, DB binding: available, Default track ID: ptrk_default123`
   - **Toggle Mechanism:** `LOG_LEVEL=info`

---

## Commit 5: test: add comprehensive database integration tests [docs/tasks/2025-06-20-21-15-database-integration.md]

**Description:**
Create comprehensive end-to-end tests for the database integration functionality at `test/database-integration.test.ts`. Tests will cover the complete workflow from WOD text input to database persistence using raw SQL operations, including: workout object generation and insertion, track association, workout scheduling, error handling scenarios, and data consistency validation. Add mock D1 database for testing that simulates prepared statement execution, test fixtures for various workout types, and performance tests for database operations. Include tests for edge cases such as duplicate workout IDs, invalid track IDs, scheduling conflicts, and SQL injection prevention through prepared statements. Set up CI/CD pipeline integration for automated testing with proper database cleanup and isolation, focusing on SQL query correctness and D1 API usage.

**Verification:**

1. **Automated Test(s):**
   - **Command:** `pnpm test:e2e test/database-integration.test.ts`
   - **Expected Outcome:** All integration tests pass including happy path, error scenarios, edge cases with proper SQL execution validation, prepared statement parameter binding verification, and mock database state consistency
2. **Logging Check:**
   - **Action:** Run test suite with comprehensive logging enabled
   - **Expected Log:** `INFO: Database integration test suite completed: 25 tests passed, 0 failed, DEBUG: SQL execution test cleanup completed successfully, all prepared statements validated`
   - **Toggle Mechanism:** `LOG_LEVEL=debug`
