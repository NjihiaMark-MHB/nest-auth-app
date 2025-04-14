import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export function createDrizzleClient(pool: Pool) {
  return drizzle(pool);
}
