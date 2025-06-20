-- Migration to align schema with production camelCase naming
-- This corrects the naming convention mismatch between development and production

-- Drop existing tables if they exist (snake_case versions)
DROP TABLE IF EXISTS team_programming_track;
DROP TABLE IF EXISTS scheduled_workout_instance;
DROP TABLE IF EXISTS track_workout;
DROP TABLE IF EXISTS programming_track;
DROP TABLE IF EXISTS workouts;

-- Recreate tables with camelCase column names to match production
-- Workouts table
CREATE TABLE workouts (
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

-- Programming tracks table
CREATE TABLE programmingTrack (
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

-- Track workouts table (many-to-many relationship between tracks and workouts)
CREATE TABLE trackWorkout (
    id TEXT PRIMARY KEY,
    trackId TEXT NOT NULL,
    workoutId TEXT NOT NULL,
    dayNumber INTEGER NOT NULL,
    weekNumber INTEGER,
    notes TEXT,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updateCounter INTEGER DEFAULT 0,
    FOREIGN KEY (trackId) REFERENCES programmingTrack(id),
    FOREIGN KEY (workoutId) REFERENCES workouts(id)
);

-- Scheduled workout instances table
CREATE TABLE scheduledWorkoutInstance (
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
    FOREIGN KEY (trackWorkoutId) REFERENCES trackWorkout(id)
);

-- Team programming tracks table (tracks assigned to teams)
CREATE TABLE teamProgrammingTrack (
    teamId TEXT NOT NULL,
    trackId TEXT NOT NULL,
    isActive INTEGER DEFAULT 1 NOT NULL,
    addedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updateCounter INTEGER DEFAULT 0,
    PRIMARY KEY (teamId, trackId),
    FOREIGN KEY (trackId) REFERENCES programmingTrack(id)
);

-- Create indexes for better performance
CREATE INDEX trackWorkout_track_idx ON trackWorkout(trackId);
CREATE INDEX trackWorkout_day_idx ON trackWorkout(dayNumber);
CREATE INDEX trackWorkout_workoutId_idx ON trackWorkout(workoutId);
CREATE INDEX trackWorkout_unique_idx ON trackWorkout(trackId, workoutId, dayNumber);

CREATE INDEX scheduledWorkoutInstance_team_idx ON scheduledWorkoutInstance(teamId);
CREATE INDEX scheduledWorkoutInstance_date_idx ON scheduledWorkoutInstance(scheduledDate);

CREATE INDEX programmingTrack_type_idx ON programmingTrack(type);
CREATE INDEX programmingTrack_owner_idx ON programmingTrack(ownerTeamId);

CREATE INDEX teamProgrammingTrack_active_idx ON teamProgrammingTrack(isActive);
