import { ResourceNotFoundException } from "@aws-sdk/client-secrets-manager";
import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import {
  EXAMPLE_JSON,
  EXAMPLE_JSON_STRING,
  EXAMPLE_STRING,
  EXAMPLE_STRING_BUFFER,
} from "../test/fixtures.ts";
import { LocalSecretsManager } from "../test/local-secrets-manager.ts";
import { InvalidSecretError, SecretParseError } from "./errors.ts";
import { SecretsFetcher } from "./fetcher.ts";

describe("SecretsFetcher", async () => {
  const container = await new LocalSecretsManager().start();
  const client = container.getClient();
  const fetcher = new SecretsFetcher(client);

  let stringArn: string;
  let jsonArn: string;
  let bufferArn: string;

  before(async () => {
    stringArn = await container.createSecret(
      "secrets/test/fetcher/string_value",
      EXAMPLE_STRING,
    );

    jsonArn = await container.createSecret(
      "secrets/test/fetcher/json_value",
      EXAMPLE_JSON_STRING,
    );

    bufferArn = await container.createBinarySecret(
      "secrets/test/fetcher/buffer_value",
      EXAMPLE_STRING_BUFFER,
    );
  });

  after(async () => {
    await container.stop();
  });

  describe("fetch", () => {
    it("returns the SecretValue for the string ARN", async () => {
      const res = await fetcher.fetch(stringArn);

      assert.equal(res.arn, stringArn);
    });

    it("returns the SecretValue for the buffer ARN", async () => {
      const res = await fetcher.fetch(bufferArn);

      assert.equal(res.arn, bufferArn);
    });

    it("with an invalid ARN throws the underlying ResourceNotFoundException", async () => {
      await assert.rejects(
        () => fetcher.fetchString("arn:aws:invalid-arn"),
        ResourceNotFoundException,
      );
    });
  });

  describe("fetchString", () => {
    it("returns the string for the specified ARN", async () => {
      const res = await fetcher.fetchString(stringArn);

      assert.equal(res, EXAMPLE_STRING);
    });

    it("with JSON returns the string", async () => {
      const res = await fetcher.fetchString(jsonArn);

      assert.equal(res, EXAMPLE_JSON_STRING);
    });

    it("with binary throws", async () => {
      await assert.rejects(
        () => fetcher.fetchString(bufferArn),
        InvalidSecretError,
      );
    });
  });

  describe("fetchJson", () => {
    it("returns the JSON for the specified ARN", async () => {
      const res = await fetcher.fetchJson(jsonArn);

      assert.deepEqual(res, EXAMPLE_JSON);
    });

    it("with a string throws SecretParseError", async () => {
      await assert.rejects(
        () => fetcher.fetchJson(stringArn),
        SecretParseError,
      );
    });

    it("with binary throws InvalidSecretError", async () => {
      await assert.rejects(
        () => fetcher.fetchJson(bufferArn),
        InvalidSecretError,
      );
    });
  });
});
