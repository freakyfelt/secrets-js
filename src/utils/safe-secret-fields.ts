import { GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";

export const DEFAULT_SAFE_FIELDS = ["Name", "VersionId"] as const;
export const ALWAYS_REDACTED = ["SecretBinary", "SecretString"] as const;

export const toSafeSecretFields = (
  input: GetSecretValueResponse,
  fields: Readonly<Array<keyof GetSecretValueResponse>> = DEFAULT_SAFE_FIELDS,
) => pick(input, fields);

function pick<T extends object>(
  input: T,
  fields: Readonly<Array<keyof T>>,
): Pick<T, (typeof fields)[number]> {
  const safeFields = Object.assign({});
  for (const field of fields) {
    if (field in input && !ALWAYS_REDACTED.includes(field as any)) {
      safeFields[field] = input[field];
    }
  }
  return safeFields;
}
