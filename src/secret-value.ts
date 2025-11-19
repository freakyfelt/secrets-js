import { GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";
import {
  InvalidSecretError,
  SecretParseError,
  UnsupportedOperationError,
} from "./errors.ts";

export type SecretPayloadType = "string" | "binary";

type SecretString = {
  type: "string";
  content: string;
};

type SecretBinary = {
  type: "binary";
  content: Uint8Array;
};

type SecretContent = SecretString | SecretBinary;

/**
 * Converts the secret response into a union type for easier type checking
 */
function getSecretContent(
  input: Pick<GetSecretValueResponse, "SecretString" | "SecretBinary">,
): SecretContent | null {
  if (typeof input.SecretString === "string") {
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

export class SecretValue {
  constructor(input: GetSecretValueResponse) {
    this.#input = { ...input };
    this.#arn = input.ARN;
    this.#content = getSecretContent(input);
  }

  #input: GetSecretValueResponse;
  #arn: string | undefined;
  #content: SecretContent | null;
  #json: unknown;

  /**
   * The ARN of the secret
   */
  get arn(): string {
    if (this.#arn === "") {
      throw new InvalidSecretError("Missing ARN in response", this.#arn);
    }

    return String(this.#arn);
  }

  /**
   * Whether the secret payload was created a string (present as SecretString) or binary (present as SecretBinary)
   */
  get payloadType(): SecretPayloadType {
    if (this.#content === null) {
      throw new InvalidSecretError("Invalid content payload", this.#arn);
    }

    return String(this.#content.type) as SecretPayloadType;
  }

  async bytes(): Promise<Uint8Array> {
    if (this.#content === null) {
      throw new InvalidSecretError("Invalid content payload", this.#arn);
    }

    switch (this.#content.type) {
      case "binary":
        return Buffer.from(this.#content.content);
      case "string":
        return Buffer.from(this.#content.content);
    }
  }

  async json(): Promise<unknown> {
    if (typeof this.#json === "undefined") {
      try {
        this.#json = JSON.parse(this.getStringValue());
      } catch (err: unknown) {
        throw new SecretParseError("Could not parse secret as JSON", this.#arn);
      }
    }

    return this.#json;
  }

  async text(): Promise<string> {
    return this.getStringValue();
  }

  private getStringValue(): string {
    if (this.#content === null) {
      throw new InvalidSecretError("Invalid content payload", this.#arn);
    }

    switch (this.#content.type) {
      case "string":
        return String(this.#content.content);
      default:
        throw new UnsupportedOperationError(
          "Cannot convert binary secrets to text",
          this.#arn,
        );
    }
  }
}
