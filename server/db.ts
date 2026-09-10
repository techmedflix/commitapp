import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Loads local .env when present; on Vercel, platform env vars are already injected.
dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.pg_connStr1 ||
  '';

if (!databaseUrl) {
  throw new Error('DATABASE_URL (or pg_connStr1) is required in .env');
}

// SSL is opt-in: set DATABASE_SSL=1/true or include sslmode=require in the URL
const useSsl =
  process.env.DATABASE_SSL === '1' ||
  process.env.DATABASE_SSL === 'true' ||
  /sslmode=require/i.test(databaseUrl);

export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.SQL_LOG === '1' ? console.log : false,
  dialectOptions: useSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: process.env.DATABASE_SSL_STRICT === '1',
        },
      }
    : undefined,
});

export async function assertDb() {
  await sequelize.authenticate();
}
