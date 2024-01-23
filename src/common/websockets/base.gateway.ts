import { WsException } from '@nestjs/websockets';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

export abstract class BaseGateway {
  protected async handleEvent<T extends object>(
    type: new () => T,
    payload: any,
    handler: (validatedPayload: T) => Promise<void>,
  ): Promise<void> {
    const validatedPayload = await this.validateDTO(type, payload);
    await handler(validatedPayload);
  }

  private async validateDTO<T extends object>(
    type: new () => T,
    payload: any,
  ): Promise<T> {
    const dto = plainToClass(type, payload);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const messages = errors.flatMap((e) => Object.values(e.constraints));
      throw new WsException(
        messages.length > 0 ? messages : 'Validation failed',
      );
    }

    return dto;
  }
}
