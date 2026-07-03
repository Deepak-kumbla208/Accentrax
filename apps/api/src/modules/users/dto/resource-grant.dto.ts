import { IsString, MinLength } from 'class-validator';

export class ResourceGrantDto {
  @IsString()
  @MinLength(1)
  resourceType!: string;

  @IsString()
  @MinLength(1)
  resourceId!: string;

  @IsString()
  @MinLength(1)
  permission!: string;
}
