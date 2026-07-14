export class CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  phone?: string;
}

export class UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  status?: string;
  permissions?: string[];
  settings?: Record<string, any>;
}

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  role: string;
  status: string;
  tenantId: string;
  lastLoginAt?: Date;
  createdAt: Date;
}
