import { PipeTransform, ArgumentMetadata, BadRequestException, Injectable } from '@hono-di/core';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
    constructor(private schema?: ZodSchema<any>) { }

    transform(value: any, metadata: ArgumentMetadata) {
        if (this.schema) {
            return this.validate(value, this.schema);
        }

        const { metatype } = metadata;
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        // If metatype is a Zod schema (unlikely as it's a class constructor usually)
        // But if we use a custom decorator that attaches the schema, we could use it here.
        // For now, we rely on the constructor schema or if the metatype itself has a 'parse' method (duck typing)

        if (metatype && (metatype as any).parse) {
            return this.validate(value, metatype as any);
        }

        return value;
    }

    private validate(value: any, schema: ZodSchema<any>) {
        try {
            return schema.parse(value);
        } catch (error) {
            throw new BadRequestException(error);
        }
    }

    private toValidate(metatype: Function): boolean {
        const types: Function[] = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
    }
}
