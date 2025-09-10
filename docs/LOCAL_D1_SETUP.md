# Local D1 Database Setup

This document explains how to set up and use a local D1 database instance for testing.

## Setup Complete ✅

Your local D1 database has been configured and is ready to use. Here's what was set up:

### Database Structure

- **Database name**: `wodsmith-db`
- **Local storage**: `.wrangler/state/v3/d1/`
- **Schema**: Complete schema with all tables and indexes
- **Test data**: Sample programming track and workouts

### Tables Created

- `workouts` - Main workout storage
- `programming_track` - Programming tracks (like CrossFit.com)
- `track_workout` - Association between tracks and workouts
- `scheduled_workout_instance` - Scheduled workouts for teams
- `team_programming_track` - Teams assigned to tracks

## Using the Local Database

### Quick Commands

```bash
# Set up/reset the database
pnpm run db:setup

# Reset database (delete and recreate)
pnpm run db:reset

# Execute raw SQL locally
pnpm run db:local --command "SELECT * FROM workouts;"

# Execute raw SQL remotely
pnpm run db:remote --command "SELECT * FROM workouts;"

# Use the database utility script
./scripts/db-local.js list-workouts
./scripts/db-local.js count-all
./scripts/db-local.js list-tables
```

### Database Utility Commands

The `./scripts/db-local.js` script provides these convenient commands:

- `list-tables` - Show all database tables
- `list-workouts` - Show all workouts with basic info
- `list-tracks` - Show all programming tracks
- `list-track-workouts` - Show workout-track associations
- `list-scheduled` - Show scheduled workout instances
- `count-all` - Count records in all tables

### Development Workflow

1. **Start local development**:

   ```bash
   pnpm start
   # This runs: wrangler dev
   ```

2. **Your Worker will automatically connect to the local D1 database**

3. **Test database operations**:

   ```bash
   # Check what's in the database
   ./scripts/db-local.js count-all

   # Add some test data and verify
   ./scripts/db-local.js list-workouts
   ```

### Accessing the Database in Code

Your existing code should work as-is. The `DB` binding in your Worker will automatically connect to the local database when running `wrangler dev`.

Example from your existing code:

```typescript
// This will use the local database automatically in dev mode
const dbService = new DatabaseService(env.DB);
await dbService.insertWorkout(workoutData);
```

### Database Files Location

Local database files are stored in:

```
.wrangler/state/v3/d1/
```

These files are gitignored and only exist locally for development.

### Migrating Schema Changes

When you need to update the database schema:

1. Create a new migration file: `migrations/XXXX_description.sql`
2. Run it locally: `wrangler d1 execute wodsmith-db --local --file ./migrations/XXXX_description.sql`
3. Test your changes
4. When ready, apply to remote: `wrangler d1 execute wodsmith-db --remote --file ./migrations/XXXX_description.sql`

### Remote Database

To interact with your production database, add the `--remote` flag:

```bash
# Execute on remote database
wrangler d1 execute wodsmith-db --remote --command "SELECT COUNT(*) FROM workouts;"

# Apply migrations to remote
wrangler d1 execute wodsmith-db --remote --file ./migrations/0001_initial_schema.sql
```

## Test Data Available

Your local database comes with:

- 1 programming track: "CrossFit.com Main Site" (`ptrk_crossfit_dotcom`)
- 2 sample workouts for testing
- All necessary table structure and indexes

## Troubleshooting

### Reset Database

If you need to start fresh:

```bash
pnpm run db:reset
```

### Check Database Status

```bash
./scripts/db-local.js list-tables
./scripts/db-local.js count-all
```

### View Raw Data

```bash
wrangler d1 execute wodsmith-db --local --command "SELECT * FROM workouts LIMIT 5;"
```

Your local D1 database is now ready for development! 🚀
