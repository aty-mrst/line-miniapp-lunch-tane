import { defineConfig } from 'drizzle-kit';

// マイグレーションは Session pooler / Direct（DATABASE_URL_MIGRATE）で流す
export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL! },
  strict: true,
});
