import { GetSecretValueRequest } from "@aws-sdk/client-secrets-manager";
import { SecretValue } from "./secret-value.ts";
import { SecretsManager } from "./types.ts";

export type FetchOptions = Omit<GetSecretValueRequest, "SecretId">;

export class SecretsFetcher {
  constructor(private client: SecretsManager) {}

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

    return new SecretValue(res);
  }
}
