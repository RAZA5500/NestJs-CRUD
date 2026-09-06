import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

// Deployed frontends allowed to call this API. Override or extend with the
// CORS_ORIGINS env var (comma separated) — useful when the Vercel URL changes.
const allowedOrigins = (
  process.env.CORS_ORIGINS ??
  'https://employee-management-system-react-steel.vercel.app'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Any localhost port, because Vite moves to 5174+ when 5173 is taken and
// `vite preview` serves on 4173. A remote page cannot forge its Origin header,
// so allowing these only ever helps someone working on their own machine.
const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // No Origin header at all: curl, Postman, or Render's health check.
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        LOCALHOST_ORIGIN.test(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
  });
  app.useGlobalPipes(new ValidationPipe())
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
