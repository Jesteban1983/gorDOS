export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(msg = 'No autorizado') {
    super(401, 'UNAUTHORIZED', msg);
  }
}

export class ForbiddenError extends AppError {
  constructor(msg = 'Prohibido') {
    super(403, 'FORBIDDEN', msg);
  }
}

export class NotFoundError extends AppError {
  constructor(msg = 'No encontrado') {
    super(404, 'NOT_FOUND', msg);
  }
}

export class ConflictError extends AppError {
  constructor(msg = 'Ya existe un registro con esos datos') {
    super(409, 'CONFLICT', msg);
  }
}

export class ValidationError extends AppError {
  constructor(msg = 'Datos inválidos') {
    super(422, 'VALIDATION_ERROR', msg);
  }
}

export class BadRequestError extends AppError {
  constructor(msg = 'Petición inválida') {
    super(400, 'BAD_REQUEST', msg);
  }
}