import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isDateRange', async: false })
export class IsDateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    if (!value || !relatedValue) {
      return true; // Let @IsOptional handle missing values
    }

    const date = new Date(value);
    const relatedDate = new Date(relatedValue);

    if (isNaN(date.getTime()) || isNaN(relatedDate.getTime())) {
      return false;
    }

    // Check if 'to' date is after 'from' date
    return date >= relatedDate;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must be after or equal to ${relatedPropertyName}`;
  }
}

export function IsDateRange(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsDateRangeConstraint,
    });
  };
}

