/**
 * TypeScript interfaces for database operations
 * These interfaces match the existing database schema structure
 */

export interface CommonColumns {
	createdAt: Date;
	updatedAt: Date;
	updateCounter: number;
}

export interface Workout extends CommonColumns {
	id: string;
	name: string;
	description: string;
	scope: 'private' | 'public';
	scheme: 'time' | 'time-with-cap' | 'pass-fail' | 'rounds-reps' | 'reps' | 'emom' | 'load' | 'calories' | 'meters' | 'feet' | 'points';
	repsPerRound?: number;
	roundsToScore?: number;
	userId?: string;
	sugarId?: string;
	tiebreakScheme?: 'time' | 'reps';
	secondaryScheme?: 'time' | 'pass-fail' | 'rounds-reps' | 'reps' | 'emom' | 'load' | 'calories' | 'meters' | 'feet' | 'points';
	sourceTrackId?: string;
}

export interface ProgrammingTrack extends CommonColumns {
	id: string;
	name: string;
	description?: string;
	type: string;
	ownerTeamId?: string;
	isPublic: number;
}

export interface TrackWorkout extends CommonColumns {
	id: string;
	trackId: string;
	workoutId: string;
	dayNumber: number;
	weekNumber?: number;
	notes?: string;
}

export interface ScheduledWorkoutInstance extends CommonColumns {
	id: string;
	teamId: string;
	trackWorkoutId: string;
	scheduledDate: Date;
	teamSpecificNotes?: string;
	scalingGuidanceForDay?: string;
	classTimes?: string; // JSON string or comma-separated times
}

export interface TeamProgrammingTrack extends CommonColumns {
	teamId: string;
	trackId: string;
	isActive: number;
	addedAt: Date;
}

// Input types for database operations
export interface WorkoutInput {
	id?: string;
	name: string;
	description: string;
	scope?: 'private' | 'public';
	scheme: 'time' | 'time-with-cap' | 'pass-fail' | 'rounds-reps' | 'reps' | 'emom' | 'load' | 'calories' | 'meters' | 'feet' | 'points';
	repsPerRound?: number;
	roundsToScore?: number;
	userId?: string;
	sugarId?: string;
	tiebreakScheme?: 'time' | 'reps';
	secondaryScheme?: 'time' | 'pass-fail' | 'rounds-reps' | 'reps' | 'emom' | 'load' | 'calories' | 'meters' | 'feet' | 'points';
	sourceTrackId?: string;
}

export interface TrackWorkoutInput {
	trackId: string;
	workoutId: string;
	dayNumber: number;
	weekNumber?: number;
	notes?: string;
}

export interface ScheduledWorkoutInstanceInput {
	teamId: string;
	trackWorkoutId: string;
	scheduledDate: Date;
	teamSpecificNotes?: string;
	scalingGuidanceForDay?: string;
	classTimes?: string;
}
