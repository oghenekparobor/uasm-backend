# Validation Documentation

## Overview

The API uses comprehensive validation with custom validators and user-friendly error messages. All input is validated before processing, ensuring data integrity and providing clear feedback to clients.

## Custom Validators

### IsUuid

Validates that a value is a valid UUID format.

**Usage:**
```typescript
import { IsUuid } from '@/common/validators';

@IsUuid({ message: 'ID must be a valid UUID' })
id: string;
```

**Error Message:**
```
"ID must be a valid UUID"
```

### IsPhone

Validates phone numbers in various formats.

**Supported Formats:**
- `+1234567890`
- `(123) 456-7890`
- `123-456-7890`
- `+1 234 567 8900`

**Usage:**
```typescript
import { IsPhone } from '@/common/validators';

@IsPhone({ message: 'Phone number must be a valid phone number' })
phone?: string;
```

**Error Message:**
```
"Phone number must be a valid phone number (e.g., +1234567890, (123) 456-7890)"
```

### IsStrongPassword

Validates password strength requirements:
- At least 8 characters long
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Usage:**
```typescript
import { IsStrongPassword } from '@/common/validators';

@IsStrongPassword({ message: 'Password must meet strength requirements' })
password: string;
```

**Error Message:**
```
"Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
```

### IsDateRange

Validates that one date is after or equal to another date.

**Usage:**
```typescript
import { IsDateRange } from '@/common/validators';

@IsDateString()
opensAt: string;

@IsDateString()
@IsDateRange('opensAt', { message: 'Closes at must be after opens at' })
closesAt: string;
```

**Error Message:**
```
"Closes at must be after or equal to opens at"
```

## Standard Validators with Custom Messages

All standard class-validator decorators support custom error messages:

### Email Validation
```typescript
@IsEmail({}, { message: 'Email must be a valid email address' })
email: string;
```

### String Validation
```typescript
@IsString({ message: 'Name must be a string' })
@IsNotEmpty({ message: 'Name is required' })
@MaxLength(100, { message: 'Name must not exceed 100 characters' })
name: string;
```

### Number Validation
```typescript
@IsInt({ message: 'Count must be an integer' })
@Min(0, { message: 'Count must be 0 or greater' })
count: number;
```

### Enum Validation
```typescript
@IsEnum(ClassType, { message: `Type must be one of: ${Object.values(ClassType).join(', ')}` })
type: ClassType;
```

### Date Validation
```typescript
@IsDateString({}, { message: 'Date must be a valid date in ISO format (YYYY-MM-DD)' })
date: string;
```

## Validation Error Response Format

When validation fails, the API returns a structured error response:

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "message": "Validation failed",
  "error": "Bad Request",
  "errors": [
    {
      "property": "email",
      "value": "invalid-email",
      "messages": [
        "Email must be a valid email address"
      ]
    },
    {
      "property": "password",
      "value": "weak",
      "messages": [
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ]
    }
  ]
}
```

### Error Object Structure

- **property**: Name of the field that failed validation
- **value**: The invalid value that was provided
- **messages**: Array of error messages for this field
- **children**: Nested validation errors (for complex objects)

## Common Validation Patterns

### Required Fields
```typescript
@IsString({ message: 'Field must be a string' })
@IsNotEmpty({ message: 'Field is required' })
field: string;
```

### Optional Fields
```typescript
@IsOptional()
@IsString({ message: 'Field must be a string' })
@MaxLength(100, { message: 'Field must not exceed 100 characters' })
field?: string;
```

### UUID Fields
```typescript
@IsUuid({ message: 'ID must be a valid UUID' })
@IsNotEmpty({ message: 'ID is required' })
id: string;
```

### Enum Fields
```typescript
@IsEnum(Status, { message: `Status must be one of: ${Object.values(Status).join(', ')}` })
@IsNotEmpty({ message: 'Status is required' })
status: Status;
```

### Number Fields
```typescript
@IsInt({ message: 'Count must be an integer' })
@Min(0, { message: 'Count must be 0 or greater' })
@Max(1000, { message: 'Count must not exceed 1000' })
count: number;
```

### Date Fields
```typescript
@IsDateString({}, { message: 'Date must be a valid date in ISO format (YYYY-MM-DD)' })
@IsNotEmpty({ message: 'Date is required' })
date: string;
```

## Field Length Limits

Common maximum lengths used across the API:

- **Names** (firstName, lastName): 100 characters
- **Email**: Validated by email format
- **Phone**: Validated by phone format
- **Descriptions**: 1000-2000 characters (varies by context)
- **Notes**: 5000 characters
- **Titles**: 200 characters
- **Types**: 50 characters

## Password Requirements

All password fields enforce strong password requirements:

- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*()_+-=[]{}|;':"\\,.<>/?)

**Example Valid Passwords:**
- `Password123!`
- `MySecure@Pass1`
- `Test#Pass2024`

**Example Invalid Passwords:**
- `password` (no uppercase, number, or special char)
- `PASSWORD123` (no lowercase or special char)
- `Password!` (no number)
- `Pass123` (too short)

## Date Format

All date fields accept ISO 8601 format:

- `YYYY-MM-DD` (e.g., `2024-01-15`)
- `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g., `2024-01-15T10:30:00.000Z`)

## UUID Format

All UUID fields must be valid UUID v4 format:

- Format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- Example: `550e8400-e29b-41d4-a716-446655440000`

## Frontend Integration

### Displaying Validation Errors

```typescript
interface ValidationError {
  property: string;
  value: any;
  messages: string[];
}

async function submitForm(data: any) {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (error.errors) {
        // Display field-specific errors
        error.errors.forEach((err: ValidationError) => {
          const field = document.querySelector(`[name="${err.property}"]`);
          if (field) {
            field.setAttribute('aria-invalid', 'true');
            // Show error message
            showFieldError(err.property, err.messages[0]);
          }
        });
      }
      
      throw new Error(error.message);
    }

    return response.json();
  } catch (error) {
    console.error('Validation error:', error);
  }
}
```

### Form Validation Example

```typescript
// React example
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = async (data: FormData) => {
  try {
    await submitForm(data);
    setErrors({});
  } catch (error: any) {
    if (error.errors) {
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach((err: ValidationError) => {
        fieldErrors[err.property] = err.messages[0];
      });
      setErrors(fieldErrors);
    }
  }
};

// Display errors
{errors.email && <span className="error">{errors.email}</span>}
```

## Best Practices

1. **Always provide custom messages**: Makes errors more user-friendly
2. **Use appropriate validators**: Choose validators that match your data types
3. **Set reasonable limits**: Use MaxLength to prevent abuse
4. **Validate on both client and server**: Client-side for UX, server-side for security
5. **Handle nested errors**: Some DTOs have nested objects that need validation

## Testing Validation

### Test Invalid Email
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "firstName": "John", "lastName": "Doe", "password": "Password123!"}'
```

### Test Weak Password
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "firstName": "John", "lastName": "Doe", "password": "weak"}'
```

### Test Invalid UUID
```bash
curl -X POST http://localhost:3000/members \
  -H "Content-Type: application/json" \
  -d '{"firstName": "John", "lastName": "Doe", "currentClassId": "invalid-uuid"}'
```

### Test Missing Required Field
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "firstName": "John"}'
```

## Common Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Email must be a valid email address" | Invalid email format | Use valid email format (e.g., `user@example.com`) |
| "Password must be at least 8 characters..." | Weak password | Use strong password with uppercase, lowercase, number, and special char |
| "ID must be a valid UUID" | Invalid UUID format | Use valid UUID v4 format |
| "Field is required" | Missing required field | Provide the required field |
| "Field must not exceed X characters" | Field too long | Reduce field length |
| "Count must be 0 or greater" | Negative number | Use 0 or positive number |
| "Date must be a valid date..." | Invalid date format | Use ISO 8601 format (YYYY-MM-DD) |

