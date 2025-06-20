/**
 * Raw SQL queries for database operations
 * Using prepared statements with D1 API for type safety and performance
 */

// Workout queries
export const INSERT_WORKOUT = `
	INSERT INTO workouts (
		id, name, description, scope, scheme, repsPerRound, roundsToScore,
		userId, sugarId, tiebreakScheme, secondaryScheme, sourceTrackId,
		createdAt, updatedAt, updateCounter
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const INSERT_WORKOUT_OR_IGNORE = `
	INSERT OR IGNORE INTO workouts (
		id, name, description, scope, scheme, repsPerRound, roundsToScore,
		userId, sugarId, tiebreakScheme, secondaryScheme, sourceTrackId,
		createdAt, updatedAt, updateCounter
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const GET_WORKOUT_BY_ID = `
	SELECT * FROM workouts WHERE id = ?
`;

export const UPDATE_WORKOUT = `
	UPDATE workouts 
	SET name = ?, description = ?, scope = ?, scheme = ?, repsPerRound = ?,
		roundsToScore = ?, tiebreakScheme = ?, secondaryScheme = ?,
		updatedAt = ?, updateCounter = updateCounter + 1
	WHERE id = ?
`;

// Programming track queries
export const GET_PROGRAMMING_TRACK_BY_ID = `
	SELECT * FROM programmingTrack WHERE id = ?
`;

export const INSERT_PROGRAMMING_TRACK = `
	INSERT INTO programmingTrack (
		id, name, description, type, ownerTeamId, isPublic,
		createdAt, updatedAt, updateCounter
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// Track workout queries
export const INSERT_TRACK_WORKOUT = `
	INSERT INTO trackWorkout (
		id, trackId, workoutId, dayNumber, weekNumber, notes,
		createdAt, updatedAt, updateCounter
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const GET_TRACK_WORKOUTS = `
	SELECT tw.*, w.name as workout_name, w.description as workout_description
	FROM trackWorkout tw
	JOIN workouts w ON tw.workoutId = w.id
	WHERE tw.trackId = ?
	ORDER BY tw.dayNumber ASC
`;

export const GET_TRACK_WORKOUT_BY_ID = `
	SELECT * FROM trackWorkout WHERE id = ?
`;

// Scheduled workout instance queries
export const INSERT_SCHEDULED_WORKOUT_INSTANCE = `
	INSERT INTO scheduledWorkoutInstance (
		id, teamId, trackWorkoutId, scheduledDate, teamSpecificNotes,
		scalingGuidanceForDay, classTimes, createdAt, updatedAt, updateCounter
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const GET_SCHEDULED_WORKOUTS_BY_TEAM_AND_DATE = `
	SELECT swi.*, tw.dayNumber, tw.weekNumber, w.name as workout_name
	FROM scheduledWorkoutInstance swi
	JOIN trackWorkout tw ON swi.trackWorkoutId = tw.id
	JOIN workouts w ON tw.workoutId = w.id
	WHERE swi.teamId = ? AND DATE(swi.scheduledDate) = DATE(?)
	ORDER BY swi.scheduledDate ASC
`;

export const GET_SCHEDULED_WORKOUT_BY_ID = `
	SELECT * FROM scheduledWorkoutInstance WHERE id = ?
`;

// Team programming track queries
export const GET_TEAM_ACTIVE_TRACKS = `
	SELECT tpt.*, pt.name as track_name, pt.description as track_description
	FROM teamProgrammingTrack tpt
	JOIN programmingTrack pt ON tpt.trackId = pt.id
	WHERE tpt.teamId = ? AND tpt.isActive = 1
	ORDER BY tpt.addedAt DESC
`;

export const INSERT_TEAM_PROGRAMMING_TRACK = `
	INSERT INTO teamProgrammingTrack (
		teamId, trackId, isActive, addedAt, createdAt, updatedAt, updateCounter
	) VALUES (?, ?, ?, ?, ?, ?, ?)
`;

// Utility queries
export const CHECK_WORKOUT_EXISTS = `
	SELECT COUNT(*) as count FROM workouts WHERE id = ?
`;

export const CHECK_TRACK_EXISTS = `
	SELECT COUNT(*) as count FROM programmingTrack WHERE id = ?
`;

export const CHECK_TEAM_EXISTS = `
	SELECT COUNT(*) as count FROM team WHERE id = ?
`;

export const GET_NEXT_DAY_NUMBER_FOR_TRACK = `
	SELECT COALESCE(MAX(dayNumber), 0) + 1 as nextDayNumber
	FROM trackWorkout
	WHERE trackId = ?
`;
