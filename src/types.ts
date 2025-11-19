import { SecretsManager as AWSSecretsManager } from "@aws-sdk/client-secrets-manager";

export type SecretsManager = Pick<AWSSecretsManager, "getSecretValue">;
