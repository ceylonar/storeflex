import {Pool} from 'pg';

// This creates a "pool" of database connections that can be reused,
// which is more efficient than creating a new connection for every query.
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    // Supabase requires an SSL connection, but we don't want to
    // verify the certificate in this example.
    rejectUnauthorized: false,
  },
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};
