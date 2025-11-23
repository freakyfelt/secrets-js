import { GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";
import {
  InvalidSecretError,
  SecretParseError,
  UnsupportedOperationError,
} from "./errors.ts";
import { SecretPayloadType } from "./types.ts";
import { getSecretContent, SecretContent } from "./utils/secret-content.ts";
import { deepCopySecretValueCommandOutput } from "./utils/secret-copier.ts";

export class SecretValue {
  constructor(input: GetSecretValueResponse) {
    this.#input = deepCopySecretValueCommandOutput(input);
    this.#arn = input.ARN ?? null;
    this.#content = getSecretContent(input);
  }

  #input: GetSecretValueResponse;
  #arn: string | null;
  #content: SecretContent | null;

  /**
   * The ARN of the secret
   */
  get ARN(): string {
    return this.#mustGetInputString("ARN");
  }

  /**
   * The user-specified friendly name of the secret
   */
  get Name(): string {
    return this.#mustGetInputString("Name");
  }

  /**
   * The AWS-specified VersionId of the secret
   */
  get VersionId(): string {
    return this.#mustGetInputString("VersionId");
  }

  /**
   * The array of version stages associated with the secret
   *
   * See also {@link isAWSCurrentVersion} and {@link hasVersionStage}
   */
  get VersionStages(): string[] {
    return [
      ...this.#unsafeMustGetInputField("VersionStages", (value) =>
        Array.isArray(value),
      ),
    ];
  }

  get CreatedDate(): Date {
    const createdDate = this.#unsafeMustGetInputField(
      "CreatedDate",
      (value) => value instanceof Date,
    );

    return new Date(createdDate);
  }

  /**
   * True if the secret is the current version per AWS (via the AWSCURRENT version stage)
   */
  isAWSCurrentVersion(): boolean {
    return this.hasVersionStage("AWSCURRENT");
  }

  /**
   * True if the secret is the upcoming/pending version per AWS (via the AWSPENDING version stage)
   */
  isAWSPendingVersion(): boolean {
    return this.hasVersionStage("AWSPENDING");
  }

  /**
   * True if the secret is the previous/outgoing version per AWS (via the AWSPREVIOUS version stage)
   */
  isAWSPreviousVersion(): boolean {
    return this.hasVersionStage("AWSPREVIOUS");
  }

  /**
   * Checks if the secret has the specified version stage
   *
   * @param stage The stage name to search for
   * @returns True if the secret has the specified version stage
   */
  hasVersionStage(stage: string): boolean {
    return this.#input.VersionStages?.includes(stage) ?? false;
  }

  /**
   * Whether the secret payload was created a string (present as SecretString) or binary (present as SecretBinary)
   */
  get payloadType(): SecretPayloadType {
    if (this.#content === null) {
      throw new InvalidSecretError("Invalid content payload", this.#arn);
    }

    return this.#content.type;
  }

  /**
   * Converts the SecretString or SecretBinary content into a Buffer
   */
  async bytes(): Promise<Uint8Array> {
    if (this.#content === null) {
      throw new InvalidSecretError("Invalid content payload", this.#arn);
    }

    switch (this.#content.type) {
      case "binary":
        return Buffer.from(this.#content.SecretBinary);
      case "string":
        return Buffer.from(this.#content.SecretString);
    }
  }

  /**
   * Parses the contents of SecretString as JSON, throwing a SecretParseError on failure to do so
   *
   * NOTE: The JSON string is always re-parsed on each request
   *
   * @throws {UnsupportedOperationError} the SecretString field is not populated
   * @throws {SecretParseError} the contents of SecretString is not valid JSON
   */
  async json(): Promise<unknown> {
    const str = this.#mustGetSecretString();

    try {
      // WARNING: Always re-parse the JSON string to ensure it is not poisoned
      return JSON.parse(str);
    } catch (err: unknown) {
      throw new SecretParseError("Could not parse secret as JSON", this.#arn);
    }
  }

  /**
   * Returns the raw response body from the GetSecretValue API call
   *
   * NOTE: The API response will usually be a {@link GetSecretCommandOutput} that implements GetSecretValueResponse
   */
  async raw(): Promise<GetSecretValueResponse> {
    return deepCopySecretValueCommandOutput(this.#input);
  }

  /**
   * Returns a string with the contents of `SecretString`
   */
  async text(): Promise<string> {
    return this.#mustGetSecretString();
  }

  /**
   * Calls {@link #mustGetInputField}, ensures the value is a string, and returns it
   *
   * NOTE: Strings are immutable, so we can safely return the instance of the field.
   *
   * @param fieldName The name of the field on GetSecretValueResponse to fetch
   * @returns the string value of the field
   */
  #mustGetInputString(fieldName: keyof GetSecretValueResponse): string {
    return this.#unsafeMustGetInputField(
      fieldName,
      (value) => typeof value === "string",
    );
  }

  /**
   * Fetches the value of a field from the input object, ensuring it is of the expected type.
   *
   * WARNING: unsafe because this returns the instance of the field. Consumers must create a copy of the value before returning it.
   *
   * @param fieldName The name of the field on GetSecretValueResponse to fetch
   * @param typeVerifier A function that verifies the type of the field value
   * @returns The value of the field, cast to the expected type
   */
  #unsafeMustGetInputField<T>(
    fieldName: keyof GetSecretValueResponse,
    typeVerifier: (value: unknown) => value is T,
  ): T {
    if (!Object.hasOwn(this.#input, fieldName)) {
      throw new InvalidSecretError(
        `Missing ${fieldName} in response`,
        this.#arn,
      );
    }

    const value = this.#input[fieldName];
    if (!typeVerifier(value)) {
      throw new InvalidSecretError(
        `Invalid ${fieldName} in response`,
        this.#arn,
      );
    }

    return value;
  }

  /**
   * Fetches the value of the SecretString field or throws UnsupportedOperationError if the secret is binary
   *
   * @throws UnsupportedOperationError if the secret is binary
   */
  #mustGetSecretString(): string {
    if (this.#content?.type !== "string") {
      throw new UnsupportedOperationError(
        "Cannot convert binary secrets to text",
        this.#arn,
      );
    }

    return this.#content.SecretString;
  }

  /**
   * Custom inspect method to show only the following information in console.log() calls:
   *
   * - Name
   * - VersionId
   *
   * The output will also indicate the content type ("string", "binary") in parenthesis
   */
  [Symbol.for("nodejs.util.inspect.custom")](
    depth: number,
    options: any,
    inspect: any,
  ) {
    const contentType = this.#content?.type ?? "unknown";
    if (depth <= 0) {
      return options.stylize(`[SecretValue(${contentType})]`, "special");
    }

    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1,
    });

    const { Name, VersionId } = this.#input;
    const inner = inspect({ Name, VersionId }, newOptions);

    return `${options.stylize(`SecretValue(${contentType})`, "special")} ${inner}`;
  }
}
