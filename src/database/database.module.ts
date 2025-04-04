import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DATABASE_CONNECTION } from './database-connection';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: async (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.getOrThrow<string>('DATABASE_URL'),
        });

        await connectWithRetry(pool); // Using retry logic here

        // Graceful shutdown handling
        process.on('SIGTERM', async () => {
          Logger.log(
            'Shutting down database connection pool...',
            'DatabaseModule',
          );
          await pool.end();
          process.exit(0);
        });

        process.on('SIGINT', async () => {
          Logger.log(
            'Shutting down database connection pool...',
            'DatabaseModule',
          );
          await pool.end();
          process.exit(0);
        });

        return pool;
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}

// Retry logic function
async function connectWithRetry(
  pool: Pool,
  retries = 5,
  delay = 2000,
): Promise<void> {
  const logger = new Logger('DatabaseModule');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.log(
        `Attempting database connection (Attempt ${attempt} of ${retries})...`,
      );
      await pool.query('SELECT 1'); // This line checks if the connection is successful
      logger.log('Database connected successfully');
      return; // Exit if successful
    } catch (error) {
      logger.error(`Database connection failed: ${error.message}`);

      if (attempt < retries) {
        logger.warn(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.error('Max retries reached. Exiting...');
        process.exit(1); // Exit the application if connection fails after retries
      }
    }
  }
}
