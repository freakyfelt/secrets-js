import { GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";
import {
  InvalidSecretError,
  SecretParseError,
  UnsupportedOperationError,
} from "./errors.ts";
import { toSafeSecretFields } from "./utils/safe-secret-fields.ts";
import { getSecretContent, SecretContent } from "./utils/secret-content.ts";

export type SecretPayloadType = "string" | "binary";

export class SecretValue {
  constructor(
    input: GetSecretValueResponse,
    safeFields?: GetSecretValueResponse,
  ) {
    this.#input = { ...input };
    this.#safeFields = safeFields ?? toSafeSecretFields(input);
    this.#arn = input.ARN ?? null;
    this.#content = getSecretContent(input);
  }

  #input: GetSecretValueResponse;
  #safeFields: GetSecretValueResponse;
  #arn: string | null;
  #content: SecretContent | null;
  #json: unknown;

  /**
   * The ARN of the secret
   */
  get ARN(): string {
    if (this.#arn === null) {
      throw new InvalidSecretError("Missing ARN in response", this.#safeFields);
    }

    return String(this.#arn);
  }

  /**
   * Whether the secret payload was created a string (present as SecretString) or binary (present as SecretBinary)
   */
  get payloadType(): SecretPayloadType {
    if (this.#content === null) {
      throw new InvalidSecretError("Invalid content payload", this.#safeFields);
    }

    return String(this.#content.type) as SecretPayloadType;
  }

  /**
   * Converts the SecretString or SecretBinary content into a Buffer
   */
  async bytes(): Promise<Uint8Array> {
    if (this.#content === null) {
      throw new InvalidSecretError("Invalid content payload", this.#safeFields);
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
   * @throws {UnsupportedOperationError} the SecretString field is not populated
   * @throws {SecretParseError} the contents of SecretString is not valid JSON
   */
  async json(): Promise<unknown> {
    if (typeof this.#json === "undefined") {
      const str = this.getStringValue();

      try {
        this.#json = JSON.parse(str);
      } catch (err: unknown) {
        throw new SecretParseError(
          "Could not parse secret as JSON",
          this.#safeFields,
        );
      }
    }

    return this.#json;
  }

  /**
   * Returns the raw response body from the GetSecretValue API call
   */
  async raw(): Promise<GetSecretValueResponse> {
    // NOTE: this still risks poisoning VersionStages, $metadata, etc., but not the secret itself
    // TBD if we need to actually do a deep copy which would require handling the SecretBinary
    return { ...this.#input };
  }

  /**
   * Returns a string with the contents of `SecretString`
   */
  async text(): Promise<string> {
    return this.getStringValue();
  }

  /**
   * Custom inspect method to show only the following information in console.log() calls:
   * - ARN
   * - Name
   * - VersionId
   * - VersionStages
   *
   * The output will also indicate the content type ("string", "binary") in parenthesis
   */
  [Symbol.for("nodejs.util.inspect.custom")](
    depth: number,
    options: any,
    inspect: any,
  ) {
    if (depth <= 0) {
      return options.stylize(
        `[SecretValue(${this.#content?.type})]`,
        "special",
      );
    }

    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1,
    });

    const inner = inspect(this.#safeFields, newOptions);

    return `${options.stylize(`SecretValue(${this.#content?.type})`, "special")} ${inner}`;
  }

  private getStringValue(): string {
    if (this.#content?.type !== "string") {
      throw new UnsupportedOperationError(
        "Cannot convert binary secrets to text",
        this.#safeFields,
      );
    }

    return String(this.#content.content);
  }
}
