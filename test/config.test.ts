/**
 * Configuration validation tests
 */

import { describe, it, expect } from 'bun:test';

describe('Configuration Tests', () => {
	describe('Environment Variables', () => {
		it('should validate environment variable types in worker configuration', () => {
			// Read worker configuration to ensure types are correct
			const fs = require('fs');
			const path = require('path');
			
			const workerConfigPath = path.join(__dirname, '../worker-configuration.d.ts');
			const configContent = fs.readFileSync(workerConfigPath, 'utf8');
			
			expect(configContent).toContain('DEFAULT_TRACK_ID: string');
			expect(configContent).toContain('TEAM_ID: string');
			expect(configContent).toContain('USER_ID: string');
			expect(configContent).toContain('DB: D1Database');
		});

		it('should validate wrangler configuration includes required variables', () => {
			// Read wrangler.jsonc to ensure environment variables are configured
			const fs = require('fs');
			const path = require('path');
			
			const wranglerConfigPath = path.join(__dirname, '../wrangler.jsonc');
			const configContent = fs.readFileSync(wranglerConfigPath, 'utf8');
			
			expect(configContent).toContain('"DEFAULT_TRACK_ID"');
			expect(configContent).toContain('"TEAM_ID"');
			expect(configContent).toContain('"USER_ID"');
			expect(configContent).toContain('ptrk_crossfit_dotcom');
			expect(configContent).toContain('team_cokkpu1klwo0ulfhl1iwzpvn');
			expect(configContent).toContain('usr_cynhnsszya9jayxu0fsft5jg');
		});

		it('should validate D1 database binding configuration', () => {
			// Validate D1 database binding is properly configured
			const fs = require('fs');
			const path = require('path');
			
			const wranglerConfigPath = path.join(__dirname, '../wrangler.jsonc');
			const configContent = fs.readFileSync(wranglerConfigPath, 'utf8');
			
			expect(configContent).toContain('"d1_databases"');
			expect(configContent).toContain('"binding": "DB"');
			expect(configContent).toContain('"database_name": "wodsmith-db"');
			expect(configContent).toContain('"database_id": "931185e9-99e5-48f0-bf70-d03ca5936f2d"');
		});
	});

	describe('TypeScript Configuration', () => {
		it('should validate TypeScript environment types', () => {
			// Check that the main index file uses environment variables correctly
			const fs = require('fs');
			const path = require('path');
			
			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');
			
			expect(indexContent).toContain('this.env.DEFAULT_TRACK_ID');
			expect(indexContent).toContain('this.env.TEAM_ID');
			expect(indexContent).toContain('this.env.USER_ID');
			expect(indexContent).toContain('this.env.DB');
		});

		it('should validate fallback values are provided', () => {
			// Ensure fallback values are provided for environment variables
			const fs = require('fs');
			const path = require('path');
			
			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');
			
			expect(indexContent).toContain('|| \'ptrk_crossfit_dotcom\'');
			expect(indexContent).toContain('|| \'team_cokkpu1klwo0ulfhl1iwzpvn\'');
			expect(indexContent).toContain('|| \'usr_cynhnsszya9jayxu0fsft5jg\'');
		});
	});

	describe('Package.json Scripts', () => {
		it('should validate database-related scripts are present', () => {
			// Check that package.json includes database-related scripts
			const fs = require('fs');
			const path = require('path');
			
			const packagePath = path.join(__dirname, '../package.json');
			const packageContent = fs.readFileSync(packagePath, 'utf8');
			const packageJson = JSON.parse(packageContent);
			
			expect(packageJson.scripts).toBeDefined();
			expect(packageJson.scripts.build).toBeDefined();
			expect(packageJson.scripts['test:config']).toBeDefined();
		});

		it('should validate no ORM dependencies are included', () => {
			// Ensure we're not including unnecessary ORM dependencies since we're using raw SQL
			const fs = require('fs');
			const path = require('path');
			
			const packagePath = path.join(__dirname, '../package.json');
			const packageContent = fs.readFileSync(packagePath, 'utf8');
			const packageJson = JSON.parse(packageContent);
			
			const allDependencies = {
				...packageJson.dependencies,
				...packageJson.devDependencies
			};
			
			// Should not include ORM-related packages
			expect(allDependencies['drizzle-orm']).toBeUndefined();
			expect(allDependencies['drizzle-kit']).toBeUndefined();
			expect(allDependencies['prisma']).toBeUndefined();
			expect(allDependencies['sequelize']).toBeUndefined();
		});
	});

	describe('Configuration Values', () => {
		it('should validate configuration IDs follow expected patterns', () => {
			// Validate that configuration IDs follow expected naming patterns
			const fs = require('fs');
			const path = require('path');
			
			const wranglerConfigPath = path.join(__dirname, '../wrangler.jsonc');
			const configContent = fs.readFileSync(wranglerConfigPath, 'utf8');
			
			// Track ID should start with 'ptrk_'
			expect(configContent).toMatch(/"DEFAULT_TRACK_ID":\s*"ptrk_/);
			
			// Team ID should start with 'team_'
			expect(configContent).toMatch(/"TEAM_ID":\s*"team_/);
			
			// User ID should start with 'usr_'
			expect(configContent).toMatch(/"USER_ID":\s*"usr_/);
		});

		it('should validate database configuration values', () => {
			// Validate database-specific configuration
			const fs = require('fs');
			const path = require('path');
			
			const wranglerConfigPath = path.join(__dirname, '../wrangler.jsonc');
			const configContent = fs.readFileSync(wranglerConfigPath, 'utf8');
			
			// Database ID should be a valid UUID format
			expect(configContent).toMatch(/"database_id":\s*"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"/);
			
			// Database name should be valid
			expect(configContent).toContain('"database_name": "wodsmith-db"');
			
			// Binding name should be consistent
			expect(configContent).toContain('"binding": "DB"');
		});
	});

	describe('Development vs Production Config', () => {
		it('should validate configuration supports both environments', () => {
			// Ensure configuration is suitable for both development and production
			const fs = require('fs');
			const path = require('path');
			
			const indexPath = path.join(__dirname, '../src/index.ts');
			const indexContent = fs.readFileSync(indexPath, 'utf8');
			
			// Should have fallback values for development
			expect(indexContent).toContain('|| \'ptrk_crossfit_dotcom\'');
			
			// Should read from environment for production
			expect(indexContent).toContain('this.env.DEFAULT_TRACK_ID');
		});
	});
});
