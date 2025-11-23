import type {
  SecretsManager as AWSSecretsManager,
  GetSecretValueResponse,
} from "@aws-sdk/client-secrets-manager";

export type GetSecretValueMetadata = Omit<
  GetSecretValueResponse,
  "SecretString" | "SecretBinary"
>;

export type SecretsManager = Pick<AWSSecretsManager, "getSecretValue">;

export type SecretPayloadType = "string" | "binary";
