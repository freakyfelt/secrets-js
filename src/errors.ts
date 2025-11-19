export class SecretsError extends Error {
  constructor(
    msg: string,
    public readonly details: object,
  ) {
    super(msg);
  }
}

export class InvalidSecretError extends SecretsError {
  constructor(msg: string, arn: string | undefined) {
    super(msg, { arn });
  }
}

export class SecretParseError extends InvalidSecretError {}
