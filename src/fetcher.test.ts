import { ResourceNotFoundException } from "@aws-sdk/client-secrets-manager";
import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import { inspect } from "node:util";
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

  const fetchRaw = async (secretId: string, ...rest: any) =>
    (await fetcher.fetch(secretId, ...rest)).raw();

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

  describe("safeFields", () => {
    it("with overridden safeFields inspect only includes the safe fields of the SecretValue", async () => {
      const fetcher = new SecretsFetcher(client, {
        safeFields: ["ARN", "Name"],
      });
      const res = await fetcher.fetch(stringArn);
      const raw = await res.raw();

      const actual = inspect(res);
      const expected = `SecretValue(string) ${inspect({ ARN: raw.ARN, Name: raw.Name })}`;

      assert.deepEqual(actual, expected);
    });

    it("with overridden safeFields including SecretString inspect only includes the safe fields of the SecretValue", async () => {
      const fetcher = new SecretsFetcher(client, {
        safeFields: ["ARN", "Name", "SecretString"],
      });
      const res = await fetcher.fetch(stringArn);
      const raw = await res.raw();

      const actual = inspect(res);
      const expected = `SecretValue(string) ${inspect({ ARN: raw.ARN, Name: raw.Name })}`;

      assert.deepEqual(actual, expected);
    });

    it("with overridden safeFields errors only contain specified fields", async () => {
      const fetcher = new SecretsFetcher(client, {
        safeFields: ["ARN", "Name"],
      });
      const res = await fetcher.fetch(stringArn);
      const raw = await res.raw();

      const expected = { ARN: raw.ARN, Name: raw.Name };
      await assert.rejects(
        () => res.json(),
        (err) => {
          if (!(err instanceof SecretParseError)) {
            return false;
          }
          assert.deepEqual(err.details, expected);
          return true;
        },
      );
    });
  });

  describe("fetch", () => {
    it("returns the SecretValue for the string ARN", async () => {
      const res = await fetcher.fetch(stringArn);

      assert.equal(res.ARN, stringArn);
    });

    it("still redacts to the expected value", async () => {
      const res = await fetcher.fetch(stringArn);
      const raw = await res.raw();

      const { Name, VersionId } = raw;
      const expected = `SecretValue(string) ${inspect({ Name, VersionId })}`;
      const actual = inspect(res);

      assert.equal(actual, expected);
    });

    it("returns the SecretValue for the buffer ARN", async () => {
      const res = await fetcher.fetch(bufferArn);

      assert.equal(res.ARN, bufferArn);
    });

    it("with an invalid ARN throws the underlying ResourceNotFoundException", async () => {
      await assert.rejects(
        () => fetcher.fetchString("arn:aws:invalid-arn"),
        ResourceNotFoundException,
      );
    });

    it("with multiple versions and a provided VersionId fetches the previous revision", async () => {
      const secretId = "fetcher/test/multiple_versions_by_id";

      // In case it's present
      try {
        await client.deleteSecret({
          SecretId: secretId,
        });
      } catch (err) {
        // pass
      }

      const originalSecret = await client.createSecret({
        Name: secretId,
        SecretString: EXAMPLE_STRING,
      });
      const originalArn = originalSecret.ARN!;
      const originalRaw = await fetchRaw(originalArn);

      const updatedSecret = await client.putSecretValue({
        SecretId: originalArn,
        SecretString: "updated secret",
      });
      assert.equal(updatedSecret.ARN, originalArn);
      assert.notEqual(updatedSecret.VersionId, originalSecret.VersionId);

      const afterUpdateRaw = await fetchRaw(originalArn, {
        VersionId: originalSecret.VersionId,
      });
      assert.equal(afterUpdateRaw.VersionId, originalRaw.VersionId);
      assert.equal(afterUpdateRaw.SecretString, EXAMPLE_STRING);
      assert.deepEqual(afterUpdateRaw.VersionStages, ["AWSPREVIOUS"]);
    });

    it("with multiple versions and a provided VersionStage fetches the previous revision", async () => {
      const secretId = "fetcher/test/multiple_versions_by_stage";

      // In case it's present
      try {
        await client.deleteSecret({
          SecretId: secretId,
        });
      } catch (err) {
        // pass
      }

      const originalSecret = await client.createSecret({
        Name: secretId,
        SecretString: EXAMPLE_STRING,
      });
      const originalArn = originalSecret.ARN!;
      const originalRaw = await fetchRaw(originalArn);

      const updatedSecret = await client.putSecretValue({
        SecretId: originalArn,
        SecretString: "updated secret",
      });
      assert.equal(updatedSecret.ARN, originalArn);
      assert.notEqual(updatedSecret.VersionId, originalSecret.VersionId);

      const afterUpdateRaw = await fetchRaw(originalArn, {
        VersionStage: "AWSPREVIOUS",
      });
      assert.equal(afterUpdateRaw.VersionId, originalRaw.VersionId);
      assert.equal(afterUpdateRaw.SecretString, EXAMPLE_STRING);
      assert.deepEqual(afterUpdateRaw.VersionStages, ["AWSPREVIOUS"]);
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
