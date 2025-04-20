import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// Use the credentials provided
const poolConnection = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'sharmajai0309',
  database: 'edumanage',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });