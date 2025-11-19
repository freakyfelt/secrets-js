import assert from "node:assert";
import util from "node:util";
import { describe, it } from "node:test";
import { SecretValue } from "./secret-value.ts";
import {
  InvalidSecretError,
  SecretParseError,
  UnsupportedOperationError,
} from "./errors.ts";
import {
  EXAMPLE_JSON,
  EXAMPLE_STRING,
  EXAMPLE_STRING_BUFFER,
  toGetBinarySecretResponse,
  toGetSecretResponse,
} from "../test/fixtures.ts";

describe("SecretValue", () => {
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

  it("does not divulge private fields if stringified", () => {
    const formatted = util.format(stringSecret);
    assert.equal(formatted, "SecretValue {}");
  });

  describe("SecretValue.arn", () => {
    it("returns the ARN", () => {
      assert.equal(stringSecret.arn, stringSecretRes.ARN!);
    });

    it("with an empty ARN throws InvalidSecretError", () => {
      assert.throws(() => new SecretValue({}).payloadType, InvalidSecretError);
    });
  });

  describe("SecretValue.payloadType", () => {
    it("with a SecretString content returns string", () => {
      assert.equal(stringSecret.payloadType, "string");
    });

    it("with neither secret payload throws InvalidSecretError", () => {
      assert.throws(() => new SecretValue({}).payloadType, InvalidSecretError);
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

    it("with binary throws UnsupportedOperationError", () => {
      assert.rejects(
        () => stringBinarySecret.text(),
        UnsupportedOperationError,
      );
    });
  });
});
