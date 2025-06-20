-- Migration to fix table naming issue
-- Ensures all table names are snake_case while keeping camelCase column names
-- This addresses the production error: "D1_ERROR: no such table: trackWorkout"

-- First check if camelCase tables exist and rename them to snake_case
-- If they don't exist, the ALTER TABLE will fail silently with IF EXISTS

-- Rename camelCase tables to snake_case if they exist
ALTER TABLE IF EXISTS trackWorkout RENAME TO track_workout;
ALTER TABLE IF EXISTS programmingTrack RENAME TO programming_track;
ALTER TABLE IF EXISTS scheduledWorkoutInstance RENAME TO scheduled_workout_instance;
ALTER TABLE IF EXISTS teamProgrammingTrack RENAME TO team_programming_track;

-- Ensure the correct schema exists with snake_case table names and camelCase column names
-- This will create tables if they don't exist, or do nothing if they already exist

-- Workouts table (already has correct snake_case name in original schema)
CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    scope TEXT DEFAULT 'private' NOT NULL CHECK (scope IN ('private', 'public')),
    scheme TEXT NOT NULL CHECK (scheme IN ('time', 'time-with-cap', 'pass-fail', 'rounds-reps', 'reps', 'emom', 'load', 'calories', 'meters', 'feet', 'points')),
    repsPerRound INTEGER,
    roundsToScore INTEGER DEFAULT 1,
    userId TEXT,
    sugarId TEXT,
    tiebreakScheme TEXT CHECK (tiebreakScheme IN ('time', 'reps')),
    secondaryScheme TEXT CHECK (secondaryScheme IN ('time', 'pass-fail', 'rounds-reps', 'reps', 'emom', 'load', 'calories', 'meters', 'feet', 'points')),
    sourceTrackId TEXT,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updateCounter INTEGER DEFAULT 0
);

-- Programming tracks table with snake_case name and camelCase columns
CREATE TABLE IF NOT EXISTS programming_track (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    ownerTeamId TEXT,
    isPublic INTEGER DEFAULT 0 NOT NULL,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updateCounter INTEGER DEFAULT 0
);

-- Track workouts table with snake_case name and camelCase columns
CREATE TABLE IF NOT EXISTS track_workout (
    id TEXT PRIMARY KEY,
    trackId TEXT NOT NULL,
    workoutId TEXT NOT NULL,
    dayNumber INTEGER NOT NULL,
    weekNumber INTEGER,
    notes TEXT,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updateCounter INTEGER DEFAULT 0,
    FOREIGN KEY (trackId) REFERENCES programming_track(id),
    FOREIGN KEY (workoutId) REFERENCES workouts(id)
);

-- Scheduled workout instances table with snake_case name and camelCase columns
CREATE TABLE IF NOT EXISTS scheduled_workout_instance (
    id TEXT PRIMARY KEY,
    teamId TEXT NOT NULL,
    trackWorkoutId TEXT NOT NULL,
    scheduledDate INTEGER NOT NULL,
    teamSpecificNotes TEXT,
    scalingGuidanceForDay TEXT,
    classTimes TEXT,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updateCounter INTEGER DEFAULT 0,
    FOREIGN KEY (trackWorkoutId) REFERENCES track_workout(id)
);

-- Team programming tracks table with snake_case name and camelCase columns
CREATE TABLE IF NOT EXISTS team_programming_track (
    teamId TEXT NOT NULL,
    trackId TEXT NOT NULL,
    isActive INTEGER DEFAULT 1 NOT NULL,
    addedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updateCounter INTEGER DEFAULT 0,
    PRIMARY KEY (teamId, trackId),
    FOREIGN KEY (trackId) REFERENCES programming_track(id)
);

-- Recreate indexes with correct snake_case table names
CREATE INDEX IF NOT EXISTS track_workout_track_idx ON track_workout(trackId);
CREATE INDEX IF NOT EXISTS track_workout_day_idx ON track_workout(dayNumber);
CREATE INDEX IF NOT EXISTS track_workout_workoutId_idx ON track_workout(workoutId);
CREATE INDEX IF NOT EXISTS track_workout_unique_idx ON track_workout(trackId, workoutId, dayNumber);

CREATE INDEX IF NOT EXISTS scheduled_workout_instance_team_idx ON scheduled_workout_instance(teamId);
CREATE INDEX IF NOT EXISTS scheduled_workout_instance_date_idx ON scheduled_workout_instance(scheduledDate);

CREATE INDEX IF NOT EXISTS programming_track_type_idx ON programming_track(type);
CREATE INDEX IF NOT EXISTS programming_track_owner_idx ON programming_track(ownerTeamId);

CREATE INDEX IF NOT EXISTS team_programming_track_active_idx ON team_programming_track(isActive);
