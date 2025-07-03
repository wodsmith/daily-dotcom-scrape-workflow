# Team Ownership Update for Workout Table

This document summarizes the changes made to implement team ownership for workouts in the database.

## Changes Made

### 1. Database Migration

- **File**: `migrations/0006_add_team_id_to_workouts.sql`
- **Changes**:
  - Added `team_id` column to the `workouts` table
  - Created index on `team_id` for efficient queries
  - Created composite index on `team_id` and `name` for efficient lookups

### 2. TypeScript Type Updates

- **File**: `src/db/types.ts`
- **Changes**:
  - Updated `Workout` interface to include required `teamId: string` field
  - Updated `WorkoutInput` interface to include required `teamId: string` field
  - Both interfaces now enforce team ownership at the type level

### 3. Database Queries Updates

- **File**: `src/db/queries.ts`
- **Changes**:
  - Updated `INSERT_WORKOUT` and `INSERT_WORKOUT_OR_IGNORE` queries to include `team_id` parameter
  - Updated `SEARCH_WORKOUTS_BY_NAME` to filter by team ID
  - Updated `UPDATE_WORKOUT` to include `team_id` parameter
  - Added new team-scoped queries:
    - `GET_WORKOUTS_BY_TEAM`
    - `SEARCH_WORKOUTS_BY_NAME_AND_TEAM`
    - `CHECK_WORKOUT_EXISTS_FOR_TEAM`
    - `GET_WORKOUT_BY_ID_AND_TEAM`

### 4. Database Service Updates

- **File**: `src/services/database.service.ts`
- **Changes**:
  - Updated `insertWorkout` method to include `team_id` in SQL parameters
  - Updated `insertWorkoutWithFallback` method to include `team_id` in SQL parameters
  - Updated `searchWorkoutsByName` method to be team-scoped (requires `teamId` parameter)
  - Updated `findExistingWorkoutByName` method to be team-scoped (requires `teamId` parameter)
  - Added new team-scoped utility methods:
    - `getWorkoutsByTeam(teamId: string, limit?: number)`
    - `getWorkoutByIdAndTeam(workoutId: string, teamId: string)`

### 5. Main Workflow Updates

- **File**: `src/index.ts`
- **Changes**:
  - Updated workout data creation to include `teamId` field from environment variable
  - Added proper imports for `DatabaseService` and related types

### 6. Test Updates

- **File**: `test/database.service.test.ts`
- **Changes**:
  - Updated all `WorkoutInput` test objects to include required `teamId` field
  - All tests now use `'team_test_123'` as the test team ID

## Migration Notes

### Existing Data

- Existing workouts in the database will have `NULL` `team_id` values after running the migration
- You may need to run a data migration script to assign appropriate team IDs to existing workouts

### Environment Variables

The workflow now uses the `TEAM_ID` environment variable to determine which team owns newly created workouts from the CrossFit.com scraper.

### API Changes

- All methods that create or search for workouts now require a team ID
- This enforces proper team isolation at the application level
- Team-scoped queries prevent data leakage between teams

## Benefits of This Change

1. **Data Isolation**: Workouts are now properly isolated by team
2. **Security**: Teams can only access their own workouts
3. **Scalability**: Multiple teams can use the same database without conflicts
4. **Performance**: Team-scoped queries are more efficient with proper indexing
5. **Consistency**: All workout operations are now team-aware

## Next Steps

1. Run the migration: `0006_add_team_id_to_workouts.sql`
2. Update existing workouts to have appropriate team IDs
3. Test the updated functionality in development
4. Update any external API consumers to provide team IDs when creating workouts
