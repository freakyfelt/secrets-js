import assert from "node:assert";
import { describe, it } from "node:test";
import { inspect } from "node:util";
import {
  EXAMPLE_JSON,
  EXAMPLE_STRING,
  EXAMPLE_STRING_BUFFER,
  toGetBinarySecretResponse,
  toGetSecretResponse,
} from "../test/fixtures.ts";
import {
  InvalidSecretError,
  SecretParseError,
  UnsupportedOperationError,
} from "./errors.ts";
import { SecretValue } from "./secret-value.ts";

describe("SecretValue", () => {
  const emptySecret = new SecretValue({});
  const stringBinaryRes = toGetBinarySecretResponse(
    "secrets/test/string_buffer",
    EXAMPLE_STRING_BUFFER,
  );
  const stringBinarySecret = new SecretValue(stringBinaryRes);

  const jsonSecretRes = toGetSecretResponse(
    "secrets/test/json_string",
    JSON.stringify(EXAMPLE_JSON),
  );
  const jsonSecret = new SecretValue(jsonSecretRes);

  const stringSecretRes = toGetSecretResponse(
    "secrets/test/secret_string",
    EXAMPLE_STRING,
  );
  const stringSecret = new SecretValue(stringSecretRes);

  it("throws if both SecretString and SecretBinary are defined", () => {
    assert.throws(
      () => new SecretValue({ ...stringSecretRes, ...stringBinaryRes }),
      InvalidSecretError,
    );
  });

  describe("SecretValue.arn", () => {
    it("returns the ARN", () => {
      assert.equal(stringSecret.arn, stringSecretRes.ARN!);
    });

    it("with an empty ARN throws InvalidSecretError", () => {
      assert.throws(() => emptySecret.payloadType, InvalidSecretError);
    });
  });

  describe("SecretValue.payloadType", () => {
    it("with a SecretString content returns string", () => {
      assert.equal(stringSecret.payloadType, "string");
    });

    it("with a SecretBinary content returns binary", () => {
      assert.equal(stringBinarySecret.payloadType, "binary");
    });

    it("with neither secret payload throws InvalidSecretError", () => {
      assert.throws(() => emptySecret.payloadType, InvalidSecretError);
    });
  });

  describe("bytes()", () => {
    it("returns the expected Buffer", async () => {
      const res = await stringBinarySecret.bytes();

      assert.equal(res.toString(), EXAMPLE_STRING);
    });

    it("with a string payload returns the expected Buffer", async () => {
      const res = await stringSecret.bytes();

      assert.equal(res.toString(), EXAMPLE_STRING);
    });
  });

  describe("json()", () => {
    it("returns the expected object", async () => {
      const res = await jsonSecret.json();

      assert.deepEqual(res, EXAMPLE_JSON);
    });

    it("with invalid JSON throws SecretParseError", async () => {
      assert.rejects(() => stringSecret.json(), SecretParseError);
    });

    it("with a binary secret throws UnsupportedOperationError", async () => {
      await assert.rejects(
        () => stringBinarySecret.json(),
        UnsupportedOperationError,
      );
    });
  });

  describe("raw()", () => {
    it("returns the raw payload for StringSecret objects", async () => {
      const res = await stringSecret.raw();

      assert.deepEqual(res, stringSecretRes);
    });

    it("returns the raw payload for StringSecret objects", async () => {
      const res = await stringBinarySecret.raw();

      assert.deepEqual(res, stringBinaryRes);
    });
  });

  describe("text()", () => {
    it("returns the expected text", async () => {
      const res = await stringSecret.text();

      assert.equal(res, EXAMPLE_STRING);
    });

    it("with JSON returns the string", async () => {
      const res = await jsonSecret.text();

      assert.equal(res, JSON.stringify(EXAMPLE_JSON));
    });

    it("with a binary secret throws UnsupportedOperationError", async () => {
      await assert.rejects(
        () => stringBinarySecret.text(),
        UnsupportedOperationError,
      );
    });
  });

  describe("inspect()", () => {
    it("with string secret redacts to expected string", () => {
      const { ARN, Name, VersionId, VersionStages } = stringSecretRes;

      const expected = `SecretValue(string) ${inspect({ ARN, Name, VersionId, VersionStages })}`;
      const actual = inspect(stringSecret);
      assert.equal(actual, expected);
    });

    it("with string secret and depth=0 redacts string to small variant", () => {
      const actual = inspect(stringSecret, undefined, 0);
      assert.equal(actual, "[SecretValue(string)]");
    });

    it("with binary secret redacts to expected string", () => {
      const { ARN, Name, VersionId, VersionStages } = stringBinaryRes;

      const expected = `SecretValue(binary) ${inspect({ ARN, Name, VersionId, VersionStages })}`;
      const actual = inspect(stringBinarySecret);
      assert.equal(actual, expected);
    });

    it("with binary secret and depth=0 redacts string to small variant", () => {
      const actual = inspect(stringBinarySecret, undefined, 0);
      assert.equal(actual, "[SecretValue(binary)]");
    });
  });
});
