import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SERVER_CONFIG } from './configs/server.config';
import * as cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ credentials: true, origin: '*' });
  app.use(cookieParser());

  const options = new DocumentBuilder()
    .setTitle('Simple Chat App')
    .setDescription('The Simple Chat API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);

  await app.listen(SERVER_CONFIG.APP_PORT);
}
bootstrap();
