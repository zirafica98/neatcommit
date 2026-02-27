import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // GitHub
  GITHUB_APP_ID: z.string(),
  GITHUB_APP_NAME: z.string().optional(), // App name (slug) za installation URL
  GITHUB_PRIVATE_KEY: z.string(),
  GITHUB_CLIENT_ID: z.string().optional(), // Opciono - samo ako koristiš OAuth App
  GITHUB_CLIENT_SECRET: z.string().optional(), // Opciono - samo ako koristiš OAuth App
  GITHUB_WEBHOOK_SECRET: z.string(),
  GITLAB_WEBHOOK_SECRET: z.string().optional(),
  GITLAB_API_URL: z.string().url().optional(),
  GITLAB_CLIENT_ID: z.string().optional(),
  GITLAB_CLIENT_SECRET: z.string().optional(),
  BITBUCKET_WEBHOOK_SECRET: z.string().optional(),
  BITBUCKET_API_URL: z.string().url().optional(),
  BITBUCKET_CLIENT_ID: z.string().optional(),
  BITBUCKET_CLIENT_SECRET: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string(),
  LLM_MODEL: z.string().default('gpt-3.5-turbo'), // 'gpt-3.5-turbo' (jeftinije) ili 'gpt-4-turbo-preview' (bolje)
  LLM_MAX_TOKENS: z.string().default('1000'), // Smanjeno sa 2000 za uštedu
  LLM_MAX_CODE_LINES: z.string().default('2000'), // Ograniči veličinu koda

  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:4200'),

  // API
  API_URL: z.string().url().default('http://localhost:3000'),

  // Sentry (opciono)
  SENTRY_DSN: z.string().url().optional(),

  // Email/SMTP (opciono)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default env;
