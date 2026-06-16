import { i18n } from '../i18n'

export const ApiErrorCode = {
  ITEM_NOT_FOUND: 404,
  INVALID_TOKEN: 499,
  EXPIRED_TOKEN: 498,
  METHOD_NOT_ALLOWED: 405,
  INVALID_CREDENTIALS: 401,
  VALIDATION_ERRORS: 422,
  INVALID_PAYLOAD: 497,
  SESSION_KILLED: 496,
  ITEM_TO_CREATE_EXISTS: 495,
} as const;

export type ApiErrorCode = typeof ApiErrorCode[keyof typeof ApiErrorCode];

export class ApiError extends Error {
  public code: ApiErrorCode | number;
  public originalResponse?: any;

  constructor(
    code: ApiErrorCode | number,
    message: string,
    originalResponse?: any
  ) {
    super(message);
    this.code = code;
    this.originalResponse = originalResponse;
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const getErrorMessage = (code: ApiErrorCode | number): string => {
  const t = i18n.global.t;
  
  switch (code) {
    case ApiErrorCode.ITEM_NOT_FOUND:
      return t('errors.api.itemNotFound');
    case ApiErrorCode.INVALID_TOKEN:
      return t('errors.api.invalidToken');
    case ApiErrorCode.EXPIRED_TOKEN:
      return t('errors.api.expiredToken');
    case ApiErrorCode.METHOD_NOT_ALLOWED:
      return t('errors.api.methodNotAllowed');
    case ApiErrorCode.INVALID_CREDENTIALS:
      return t('errors.api.invalidCredentials');
    case ApiErrorCode.VALIDATION_ERRORS:
      return t('errors.api.validationErrors');
    case ApiErrorCode.INVALID_PAYLOAD:
      return t('errors.api.invalidPayload');
    case ApiErrorCode.SESSION_KILLED:
      return t('errors.api.sessionKilled');
    case ApiErrorCode.ITEM_TO_CREATE_EXISTS:
      return t('errors.api.itemExists');
    default:
      return t('errors.api.unexpected');
  }
};
