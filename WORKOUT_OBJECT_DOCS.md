# Workout Object Generation

This document describes the new structured workout object generation feature that creates database-ready workout objects from WOD (Workout of the Day) text.

## Overview

The `WodAnalysisAgent` now includes a `generateWorkoutObject()` method that analyzes CrossFit workout text and generates a structured object that matches your SQLite database schema.

## Usage

```typescript
import { WodAnalysisAgent } from './src/ai/agent';

const agent = new WodAnalysisAgent(ai); // ai is your Cloudflare Workers AI binding

const wodText = `
For Time:
21-15-9 reps of:
Thrusters (95/65 lb)
Pull-ups
`;

const workoutObject = await agent.generateWorkoutObject(wodText);
// Returns a structured workout object ready for database insertion
```

## Workout Object Schema

The generated workout object matches this SQLite table structure:

```sql
CREATE TABLE workouts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    scope TEXT DEFAULT 'private' NOT NULL,
    scheme TEXT NOT NULL,
    reps_per_round INTEGER,
    rounds_to_score INTEGER DEFAULT 1,
    user_id TEXT,
    sugar_id TEXT,
    tiebreak_scheme TEXT,
    secondary_scheme TEXT,
    source_track_id TEXT
);
```

## Supported Workout Schemes

The AI automatically detects and assigns the appropriate scheme:

- **`time`** - For time-based workouts (complete as fast as possible)
- **`time-with-cap`** - Time workouts with a time limit
- **`rounds-reps`** - AMRAP (As Many Rounds As Possible)
- **`reps`** - Maximum reps in a given time
- **`emom`** - Every Minute On the Minute
- **`load`** - Maximum weight/load
- **`calories`** - Calorie-based scoring
- **`meters`** - Distance-based (meters)
- **`feet`** - Distance-based (feet)
- **`points`** - Point-based scoring
- **`pass-fail`** - Completion-based workouts

## Example Output

For a typical "Fran" workout:

```json
{
	"id": "fran-thrusters-pullups",
	"name": "Fran",
	"description": "21-15-9 reps for time of Thrusters (95/65 lb) and Pull-ups",
	"scope": "private",
	"scheme": "time",
	"repsPerRound": null,
	"roundsToScore": 1,
	"tiebreakScheme": null,
	"secondaryScheme": null
}
```

## Integration in Workflow

The main workflow (`DailyScrapeWorkflow`) now includes structured workout object generation:

1. Scrapes WOD from CrossFit.com
2. Generates structured workout object
3. Performs legacy analysis (backward compatibility)
4. Returns both objects for database insertion and display

## Error Handling

If AI analysis fails, the function returns a fallback object with:

- Generated ID based on workout text
- Basic name extraction
- Original text as description
- Default "time" scheme
- Safe defaults for other fields

## Testing

Run the test suite to verify functionality:

```bash
npx tsx test/ai-agent.test.ts
```

See `src/examples.ts` for more usage examples and different workout types.
