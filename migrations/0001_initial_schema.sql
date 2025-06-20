-- Initial schema for workout database
-- Based on the TypeScript interfaces and queries in the project

-- Workouts table
CREATE TABLE workouts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    scope TEXT DEFAULT 'private' NOT NULL CHECK (scope IN ('private', 'public')),
    scheme TEXT NOT NULL CHECK (scheme IN ('time', 'time-with-cap', 'pass-fail', 'rounds-reps', 'reps', 'emom', 'load', 'calories', 'meters', 'feet', 'points')),
    reps_per_round INTEGER,
    rounds_to_score INTEGER DEFAULT 1,
    user_id TEXT,
    sugar_id TEXT,
    tiebreak_scheme TEXT CHECK (tiebreak_scheme IN ('time', 'reps')),
    secondary_scheme TEXT CHECK (secondary_scheme IN ('time', 'pass-fail', 'rounds-reps', 'reps', 'emom', 'load', 'calories', 'meters', 'feet', 'points')),
    source_track_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    update_counter INTEGER DEFAULT 0
);

-- Programming tracks table
CREATE TABLE programming_track (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    owner_team_id TEXT,
    is_public INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    update_counter INTEGER DEFAULT 0
);

-- Track workouts table (many-to-many relationship between tracks and workouts)
CREATE TABLE track_workout (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    workout_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,
    week_number INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    update_counter INTEGER DEFAULT 0,
    FOREIGN KEY (track_id) REFERENCES programming_track(id),
    FOREIGN KEY (workout_id) REFERENCES workouts(id)
);

-- Scheduled workout instances table
CREATE TABLE scheduled_workout_instance (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    track_workout_id TEXT NOT NULL,
    scheduled_date INTEGER NOT NULL,
    team_specific_notes TEXT,
    scaling_guidance_for_day TEXT,
    class_times TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    update_counter INTEGER DEFAULT 0,
    FOREIGN KEY (track_workout_id) REFERENCES track_workout(id)
);

-- Team programming tracks table (tracks assigned to teams)
CREATE TABLE team_programming_track (
    team_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    added_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    update_counter INTEGER DEFAULT 0,
    PRIMARY KEY (team_id, track_id),
    FOREIGN KEY (track_id) REFERENCES programming_track(id)
);

-- Create indexes for better performance
CREATE INDEX track_workout_track_idx ON track_workout(track_id);
CREATE INDEX track_workout_day_idx ON track_workout(day_number);
CREATE INDEX track_workout_workoutid_idx ON track_workout(workout_id);
CREATE INDEX track_workout_unique_idx ON track_workout(track_id, workout_id, day_number);

CREATE INDEX scheduled_workout_instance_team_idx ON scheduled_workout_instance(team_id);
CREATE INDEX scheduled_workout_instance_date_idx ON scheduled_workout_instance(scheduled_date);

CREATE INDEX programming_track_type_idx ON programming_track(type);
CREATE INDEX programming_track_owner_idx ON programming_track(owner_team_id);

CREATE INDEX team_programming_track_active_idx ON team_programming_track(is_active);
