import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });

    if (errors.length > 0) {
      const messages = this.formatErrors(errors);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: any[]): any[] {
    return errors.map((error) => {
      const constraints = error.constraints || {};
      const property = error.property;
      
      // Get the first constraint message (most specific)
      const messages = Object.values(constraints);
      
      // If there are nested errors, format them recursively
      if (error.children && error.children.length > 0) {
        return {
          property,
          message: messages[0] || `${property} is invalid`,
          children: this.formatErrors(error.children),
        };
      }

      return {
        property,
        message: messages[0] || `${property} is invalid`,
        value: error.value,
      };
    });
  }
}

