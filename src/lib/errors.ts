/** Structured errors for BridgedAI actions (no secret material in messages). */

export class UserError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'UserError';
    this.code = code;
  }
}

export class ConfigurationError extends UserError {
  constructor(message: string) {
    super('CONFIGURATION', message);
    this.name = 'ConfigurationError';
  }
}
