import { GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";
import { InvalidSecretError } from "../errors.ts";

export type SecretString = {
  type: "string";
  SecretString: string;
};

export type SecretBinary = {
  type: "binary";
  SecretBinary: Uint8Array;
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
      SecretString: input.SecretString,
    };
  } else if (typeof input.SecretBinary !== "undefined") {
    return {
      type: "binary",
      SecretBinary: input.SecretBinary,
    };
  } else {
    return null;
  }
}
