/**
 * Database connection utility for D1 operations
 * Provides a clean interface for executing raw SQL queries using D1's prepared statement API
 */

import { logger } from '../utils/logger';

export class DatabaseConnection {
	private db: D1Database;

	constructor(db: D1Database) {
		this.db = db;
		logger.info('Database connection initialized');
	}

	/**
	 * Execute a prepared statement with parameters
	 */
	async executeStatement(sql: string, params: any[] = []): Promise<D1Result> {
		try {
			logger.debug(`Executing SQL: ${sql.substring(0, 100)}...`, { paramCount: params.length });
			const statement = this.db.prepare(sql);
			const result = await statement.bind(...params).run();

			if (!result.success) {
				throw new Error(`SQL execution failed: ${result.error}`);
			}

			logger.debug('SQL execution successful', {
				changes: result.meta?.changes,
				lastRowId: result.meta?.last_row_id
			});

			return result;
		} catch (error) {
			logger.error('Database execution error', { sql: sql.substring(0, 100), error });
			throw error;
		}
	}

	/**
	 * Execute a query that returns data
	 */
	async executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
		try {
			logger.debug(`Executing query: ${sql.substring(0, 100)}...`, { paramCount: params.length });
			const statement = this.db.prepare(sql);
			const result = await statement.bind(...params).all();

			if (!result.success) {
				throw new Error(`Query execution failed: ${result.error}`);
			}

			logger.debug('Query execution successful', { resultCount: result.results?.length || 0 });
			return result.results as T[];
		} catch (error) {
			logger.error('Database query error', { sql: sql.substring(0, 100), error });
			throw error;
		}
	}

	/**
	 * Execute a query that returns a single row
	 */
	async executeQueryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
		try {
			logger.debug(`Executing query (first): ${sql.substring(0, 100)}...`, { paramCount: params.length });
			const statement = this.db.prepare(sql);
			const result = await statement.bind(...params).first();

			logger.debug('Query (first) execution successful', { hasResult: !!result });
			return result as T | null;
		} catch (error) {
			logger.error('Database query (first) error', { sql: sql.substring(0, 100), error });
			throw error;
		}
	}

	/**
	 * Execute multiple statements in a batch (transaction)
	 */
	async executeBatch(statements: { sql: string; params: any[] }[]): Promise<D1Result[]> {
		try {
			logger.debug(`Executing batch of ${statements.length} statements`);

			const preparedStatements = statements.map(({ sql, params }) =>
				this.db.prepare(sql).bind(...params)
			);

			const results = await this.db.batch(preparedStatements);

			// Check if any statement failed
			const failedResults = results.filter(result => !result.success);
			if (failedResults.length > 0) {
				throw new Error(`Batch execution failed: ${failedResults.map(r => r.error).join(', ')}`);
			}

			logger.debug('Batch execution successful', {
				statementCount: statements.length,
				totalChanges: results.reduce((sum, r) => sum + (r.meta?.changes || 0), 0)
			});

			return results;
		} catch (error) {
			logger.error('Database batch execution error', { statementCount: statements.length, error });
			throw error;
		}
	}

	/**
	 * Check if a table exists
	 */
	async tableExists(tableName: string): Promise<boolean> {
		try {
			const result = await this.executeQueryFirst<{ name: string }>(
				"SELECT name FROM sqlite_master WHERE type='table' AND name=?",
				[tableName]
			);
			return !!result;
		} catch (error) {
			logger.error('Error checking table existence', { tableName, error });
			return false;
		}
	}

	/**
	 * Get database info
	 */
	async getDatabaseInfo(): Promise<any> {
		try {
			const tables = await this.executeQuery(
				"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
			);

			logger.debug('Database info retrieved', { tableCount: tables.length });
			return {
				tables: tables.map(t => t.name),
				tableCount: tables.length
			};
		} catch (error) {
			logger.error('Error getting database info', { error });
			throw error;
		}
	}
}
