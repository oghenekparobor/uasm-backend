import { IsString, IsNotEmpty } from 'class-validator';
import { IsStrongPassword } from '@/common/validators/is-strong-password.decorator';

export class ResetPasswordDto {
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @IsStrongPassword({ message: 'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character' })
  newPassword: string;
}

