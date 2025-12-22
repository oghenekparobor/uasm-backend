import { IsEnum, IsNotEmpty } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class HandleRequestDto {
  @IsEnum(RequestStatus)
  @IsNotEmpty()
  status: RequestStatus;
}

