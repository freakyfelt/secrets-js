import {
  GetSecretValueCommandOutput,
  GetSecretValueResponse,
} from "@aws-sdk/client-secrets-manager";

export function deepCopySecretValueCommandOutput(
  input: GetSecretValueResponse | GetSecretValueCommandOutput,
): GetSecretValueCommandOutput {
  const { CreatedDate, SecretBinary, VersionStages, $metadata, ...rest } =
    input as GetSecretValueCommandOutput;

  const res = { ...rest } as GetSecretValueCommandOutput;
  if (CreatedDate instanceof Date) {
    res["CreatedDate"] = new Date(CreatedDate);
  }
  if (typeof SecretBinary !== "undefined") {
    res["SecretBinary"] = Buffer.from(SecretBinary);
  }
  if (Array.isArray(VersionStages)) {
    res["VersionStages"] = [...VersionStages];
  }
  if (typeof $metadata !== "undefined") {
    res["$metadata"] = { ...$metadata };
  }

  return res;
}
