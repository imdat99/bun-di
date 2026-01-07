
import { PipeTransform, ArgumentMetadata } from '../../interfaces';
import { BadRequestException } from '../exceptions';
import { Injectable } from '../../decorators';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
    transform(value: string, metadata: ArgumentMetadata): number {
        const isNumeric = !isNaN(parseFloat(value)) && isFinite(value as any);
        if (!isNumeric) {
            throw new BadRequestException('Validation failed (numeric string is expected)');
        }
        return parseInt(value, 10);
    }
}

@Injectable()
export class ParseFloatPipe implements PipeTransform<string, number> {
    transform(value: string, metadata: ArgumentMetadata): number {
        const isNumeric = !isNaN(parseFloat(value)) && isFinite(value as any);
        if (!isNumeric) {
            throw new BadRequestException('Validation failed (numeric string is expected)');
        }
        return parseFloat(value);
    }
}

@Injectable()
export class ParseBoolPipe implements PipeTransform<string | boolean, boolean> {
    transform(value: string | boolean, metadata: ArgumentMetadata): boolean {
        if (value === true || value === 'true') {
            return true;
        }
        if (value === false || value === 'false') {
            return false;
        }
        throw new BadRequestException('Validation failed (boolean string is expected)');
    }
}

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
    transform(value: any, metadata: ArgumentMetadata) {
        // Placeholder
        return value;
    }
}
