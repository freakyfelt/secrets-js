import {
  GetSecretValueRequest,
  GetSecretValueResponse,
} from "@aws-sdk/client-secrets-manager";
import { SecretValue } from "./secret-value.ts";
import { SecretsManager } from "./types.ts";
import {
  DEFAULT_SAFE_FIELDS,
  toSafeSecretFields,
} from "./utils/safe-secret-fields.ts";

export type FetchOptions = Omit<GetSecretValueRequest, "SecretId">;
export type SecretsFetcherOptions = Partial<ResolvedSecretsFetcherOptions>;

type ResolvedSecretsFetcherOptions = {
  /**
   * Fields that are safe to show in console output and error details
   *
   * @default ["Name", "VersionId"]
   */
  safeFields: Readonly<Array<keyof GetSecretValueResponse>>;
};

const DEFAULT_FETCHER_OPTIONS: ResolvedSecretsFetcherOptions = {
  safeFields: DEFAULT_SAFE_FIELDS,
};

export class SecretsFetcher {
  constructor(
    private client: SecretsManager,
    options: SecretsFetcherOptions = {},
  ) {
    this.#options = { ...DEFAULT_FETCHER_OPTIONS, ...options };
  }

  #options: ResolvedSecretsFetcherOptions;

  /**
   * Shorthand method for fetching the string representation of the SecretString
   *
   * @param input
   * @returns the resolved secret
   */
  async fetchString(secretId: string, opts?: FetchOptions): Promise<string> {
    const res = await this.fetch(secretId, opts);

    return res.text();
  }

  /**
   * Shorthand method for fetching the JSON representation of the SecretString
   */
  async fetchJson(secretId: string, opts?: FetchOptions): Promise<unknown> {
    const res = await this.fetch(secretId, opts);

    return res.json();
  }

  async fetch(secretId: string, opts?: FetchOptions): Promise<SecretValue> {
    const res = await this.client.getSecretValue({
      ...opts,
      SecretId: secretId,
    });

    const redacted = toSafeSecretFields(res, this.#options.safeFields);

    return new SecretValue(res, redacted);
  }
}
