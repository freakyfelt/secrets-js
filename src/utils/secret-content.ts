import { GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";
import { InvalidSecretError } from "../errors.ts";

export type SecretString = {
  type: "string";
  content: string;
};

export type SecretBinary = {
  type: "binary";
  content: Uint8Array;
};

export type SecretContent = SecretString | SecretBinary;

/**
 * Converts the secret response into a union type for easier type checking
 */
export function getSecretContent(
  input: Pick<GetSecretValueResponse, "ARN" | "SecretString" | "SecretBinary">,
): SecretContent | null {
  if (typeof input.SecretString === "string") {
    if (typeof input.SecretBinary !== "undefined") {
      throw new InvalidSecretError(
        "Both SecretString and SecretBinary defined",
        input.ARN ?? null,
      );
    }
    return {
      type: "string",
      content: input.SecretString,
    };
  } else if (typeof input.SecretBinary !== "undefined") {
    return {
      type: "binary",
      content: input.SecretBinary,
    };
  } else {
    return null;
  }
}
