import { GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";
import {
  InvalidSecretError,
  SecretParseError,
  UnsupportedOperationError,
} from "./errors.ts";
import { getSecretContent, SecretContent } from "./utils/secret-content.ts";

export type SecretPayloadType = "string" | "binary";

export class SecretValue {
  constructor(input: GetSecretValueResponse) {
    this.#input = { ...input };
    this.#arn = input.ARN ?? null;
    this.#content = getSecretContent(input);
  }

  #input: GetSecretValueResponse;
  #arn: string | null;
  #content: SecretContent | null;
  #json: unknown;

  /**
   * The ARN of the secret
   */
  get arn(): string {
    if (this.#arn === null) {
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

  /**
   * Parses the contents of SecretString as JSON, throwing a SecretParseError on failure to do so
   *
   * @throws {InvalidSecretError} the SecretString field is not populated
   * @throws {SecretParseError} the contents of SecretString is not valid JSON
   */
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

  /**
   * Returns a string with the contents of `SecretString`
   */
  async text(): Promise<string> {
    return this.getStringValue();
  }

  private getStringValue(): string {
    if (this.#content?.type !== "string") {
      throw new UnsupportedOperationError(
        "Cannot convert binary secrets to text",
        this.#arn,
      );
    }

    return String(this.#content.content);
  }
}
