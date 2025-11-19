import { GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";
import { InvalidSecretError, SecretParseError } from "./errors.ts";

export type SecretPayloadType = "string" | "binary";

export class SecretValue {
  constructor(input: GetSecretValueResponse) {
    this.#input = { ...input };
    this.#arn = input.ARN;
  }

  #input: GetSecretValueResponse;
  #arn: string | undefined;
  #text: string | undefined;
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
    if (typeof this.#input.SecretString === "string") {
      return "string";
    } else if (typeof this.#input.SecretBinary !== "undefined") {
      return "binary";
    } else {
      throw new InvalidSecretError("Missing payload type", this.#arn);
    }
  }

  async bytes(): Promise<Uint8Array> {
    switch (this.payloadType) {
      case "binary":
        return Buffer.from(this.#input.SecretBinary!);
      case "string":
        return Buffer.from(this.#input.SecretString!);
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
    if (typeof this.#text !== "undefined") {
      return this.#text;
    }

    switch (this.payloadType) {
      case "string":
        this.#text = String(this.#input.SecretString);
        return this.#text;
      default:
        throw new InvalidSecretError(
          "Expected secret to include a string",
          this.#arn,
        );
    }
  }
}
