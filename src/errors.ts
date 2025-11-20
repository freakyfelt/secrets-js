import { GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";

export class SecretsError extends Error {
  constructor(
    msg: string,
    public readonly details: object,
  ) {
    super(msg);
  }
}

/**
 * A class of errors around a specific SecretValue
 */
export class InvalidSecretError extends SecretsError {
  constructor(msg: string, safeFields: GetSecretValueResponse) {
    super(msg, { ...safeFields });
  }
}

/**
 * Thrown when a parser exception was thrown while parsing the secret
 */
export class SecretParseError extends InvalidSecretError {}

/**
 * Thrown when the requested operation is not supported
 */
export class UnsupportedOperationError extends InvalidSecretError {}
