import { describe, it, expect } from 'bun:test';
import { ZodValidationPipe } from '../src/zod-validation.pipe';
import { z } from 'zod';
import { BadRequestException } from '@hono-di/core';

describe('ZodValidationPipe', () => {
    it('should validate values using a schema', () => {
        const schema = z.object({
            name: z.string(),
            age: z.number(),
        });
        const pipe = new ZodValidationPipe(schema);

        const validValue = { name: 'John', age: 30 };
        expect(pipe.transform(validValue, { type: 'body' })).toEqual(validValue);

        const invalidValue = { name: 'John', age: '30' };
        expect(() => pipe.transform(invalidValue, { type: 'body' })).toThrow(BadRequestException);
    });
});
