import { GetSecretValueCommandOutput } from "@aws-sdk/client-secrets-manager";
import { randomUUID } from "node:crypto";

export const EXAMPLE_JSON = {
  str: "hello world",
  flt: 0.12345,
  int: 9876,
  bool: false,
  arr: ["hello", 0.12345, 9876, false, { obj: true }],
  obj: {
    deeply: {
      nested: true,
    },
  },
} as const;
export const EXAMPLE_JSON_STRING = JSON.stringify(EXAMPLE_JSON);

export const EXAMPLE_STRING = "example string";
export const EXAMPLE_STRING_BUFFER = Buffer.from(EXAMPLE_STRING);

export const toGetSecretResponse = (
  name: string,
  content: string,
): GetSecretValueCommandOutput => ({
  ARN: `arn:aws:secretsmanager:us-east-1:01234567890:secret:${name}-1a2b3c`,
  Name: name,
  VersionId: "1a2b3c",
  SecretString: content,
  VersionStages: ["AWSCURRENT"],
  CreatedDate: new Date("2022-01-23T12:34:56.000Z"),
  $metadata: {
    httpStatusCode: 200,
    requestId: randomUUID(),
  },
});

export const toGetBinarySecretResponse = (
  name: string,
  content: Buffer,
): GetSecretValueCommandOutput => ({
  ARN: `arn:aws:secretsmanager:us-east-1:01234567890:secret:${name}-1a2b3c`,
  Name: name,
  VersionId: "1a2b3c",
  SecretBinary: content,
  VersionStages: ["AWSCURRENT"],
  CreatedDate: new Date("2022-01-23T12:34:56.000Z"),
  $metadata: {
    httpStatusCode: 200,
    requestId: randomUUID(),
  },
});
