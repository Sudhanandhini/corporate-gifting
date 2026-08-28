// Runs schema.sql + seed.sql against MySQL using the .env credentials.
// Usage:  npm run db:setup
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, '..', 'db');

const schema = fs.readFileSync(path.join(dbDir, 'schema.sql'), 'utf8');
const seed = fs.readFileSync(path.join(dbDir, 'seed.sql'), 'utf8');

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
});

console.log('Applying schema...');
await conn.query(schema);
console.log('Seeding data...');
await conn.query(seed);
await conn.end();
console.log('Database ready ✔  (database: %s)', process.env.DB_NAME || 'corporate_gifting');
