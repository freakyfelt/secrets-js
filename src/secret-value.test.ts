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

  describe("SecretValue.ARN", () => {
    it("returns the ARN", () => {
      assert.equal(stringSecret.ARN, stringSecretRes.ARN!);
    });

    it("with an unspecified ARN throws InvalidSecretError", () => {
      assert.throws(() => emptySecret.ARN, InvalidSecretError);
    });

    it("with a non-string ARN throws InvalidSecretError", () => {
      const invalidSecret = new SecretValue({
        ...stringSecretRes,
        ARN: new Date() as any,
      });
      assert.throws(() => invalidSecret.ARN, InvalidSecretError);
    });
  });

  describe("SecretValue.Name", () => {
    it("returns the Name", () => {
      assert.equal(stringSecret.Name, stringSecretRes.Name!);
    });

    it("with an unspecified Name throws InvalidSecretError", () => {
      assert.throws(() => emptySecret.Name, InvalidSecretError);
    });

    it("with a non-string Name throws InvalidSecretError", () => {
      const invalidSecret = new SecretValue({
        ...stringSecretRes,
        Name: new Date() as any,
      });
      assert.throws(() => invalidSecret.Name, InvalidSecretError);
    });
  });

  describe("SecretValue.VersionId", () => {
    it("returns the VersionId", () => {
      assert.equal(stringSecret.VersionId, stringSecretRes.VersionId!);
    });

    it("with an unspecified VersionId throws InvalidSecretError", () => {
      assert.throws(() => emptySecret.VersionId, InvalidSecretError);
    });

    it("with a non-string VersionId throws InvalidSecretError", () => {
      const invalidSecret = new SecretValue({
        ...stringSecretRes,
        VersionId: new Date() as any,
      });
      assert.throws(() => invalidSecret.VersionId, InvalidSecretError);
    });
  });

  describe("SecretValue.CreatedDate", () => {
    it("returns a copy of the CreatedDate", () => {
      const actual = stringSecret.CreatedDate;

      assert.notEqual(actual, stringSecretRes.CreatedDate!);
      assert.deepEqual(actual, stringSecretRes.CreatedDate!);
    });

    it("with an unspecified CreatedDate throws InvalidSecretError", () => {
      assert.throws(() => emptySecret.CreatedDate, InvalidSecretError);
    });

    it("with a non-string CreatedDate throws InvalidSecretError", () => {
      const invalidSecret = new SecretValue({
        ...stringSecretRes,
        // CreatedDate must always be a Date object
        CreatedDate: "2025-01-02" as any,
      });
      assert.throws(() => invalidSecret.CreatedDate, InvalidSecretError);
    });
  });

  describe("SecretValue.VersionStages", () => {
    it("returns the VersionStages", () => {
      const actual = stringSecret.VersionStages;
      // ensure that they are different arrays, but same deep equality content
      assert.notEqual(actual, stringSecretRes.VersionStages!);
      assert.deepEqual(actual, stringSecretRes.VersionStages!);
    });

    it("with an unspecified VersionStages throws InvalidSecretError", () => {
      assert.throws(() => emptySecret.VersionStages, InvalidSecretError);
    });

    it("with a non-Array VersionStages throws InvalidSecretError", () => {
      const invalidSecret = new SecretValue({
        ...stringSecretRes,
        VersionStages: "hello world" as any,
      });
      assert.throws(() => invalidSecret.VersionStages, InvalidSecretError);
    });
  });

  describe("SecretValue version stage helper methods", () => {
    const currentSecret = new SecretValue({
      ...stringSecretRes,
      VersionStages: ["AWSCURRENT"],
    });

    const previousSecret = new SecretValue({
      ...stringSecretRes,
      VersionStages: ["AWSPREVIOUS"],
    });

    const pendingSecret = new SecretValue({
      ...stringSecretRes,
      VersionStages: ["AWSPENDING"],
    });

    const allStagesSecret = new SecretValue({
      ...stringSecretRes,
      VersionStages: ["AWSCURRENT", "AWSPREVIOUS", "AWSPENDING"],
    });

    const customCurrentStageSecret = new SecretValue({
      ...stringSecretRes,
      VersionStages: ["CUSTOM_STAGE", "AWSCURRENT"],
    });

    describe("hasVersionStage", () => {
      it("returns true if the value is the only value in the VersionStages array", () => {
        assert.equal(pendingSecret.hasVersionStage("AWSPENDING"), true);
      });

      it("with multiple VersionStages items returns true for any VersionStage present in the array", () => {
        ["CUSTOM_STAGE", "AWSCURRENT"].forEach((stage) => {
          assert.equal(customCurrentStageSecret.hasVersionStage(stage), true);
        });
      });

      it("with an invalid VersionStage returns false", () => {
        assert.equal(emptySecret.hasVersionStage("AWSCURRENT"), false);
      });
    });

    it("isAWSCurrentVersion returns the expected responses", () => {
      [
        [currentSecret, true],
        [previousSecret, false],
        [pendingSecret, false],
        [allStagesSecret, true],
        [customCurrentStageSecret, true],
        [emptySecret, false],
      ].forEach(([secret, expected]) => {
        assert.equal((secret as SecretValue).isAWSCurrentVersion(), expected);
      });
    });

    it("isAWSPendingVersion returns the expected responses", () => {
      [
        [currentSecret, false],
        [previousSecret, false],
        [pendingSecret, true],
        [allStagesSecret, true],
        [customCurrentStageSecret, false],
        [emptySecret, false],
      ].forEach(([secret, expected]) => {
        assert.equal((secret as SecretValue).isAWSPendingVersion(), expected);
      });
    });

    it("isAWSPreviousVersion returns the expected responses", () => {
      [
        [currentSecret, false],
        [previousSecret, true],
        [pendingSecret, false],
        [allStagesSecret, true],
        [customCurrentStageSecret, false],
        [emptySecret, false],
      ].forEach(([secret, expected]) => {
        assert.equal((secret as SecretValue).isAWSPreviousVersion(), expected);
      });
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

    it("always returns a different object", async () => {
      const res1 = await jsonSecret.json();
      const res2 = await jsonSecret.json();

      assert.notEqual(res1, res2);
      assert.deepEqual(res1, res2);

      (res1 as any)["foo"] = "bar";
      assert.notDeepEqual(res1, res2);
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
    it("returns a copy of the raw payload for StringSecret objects", async () => {
      const res = await stringSecret.raw();

      assert.notEqual(res, stringSecretRes);
      assert.deepEqual(res, stringSecretRes);
    });

    it("returns a copy of the raw payload for StringBinary objects", async () => {
      const res = await stringBinarySecret.raw();

      assert.notEqual(res, stringBinaryRes);
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
      const { Name, VersionId } = stringSecretRes;

      const expected = `SecretValue(string) ${inspect({ Name, VersionId })}`;
      const actual = inspect(stringSecret);
      assert.equal(actual, expected);
    });

    it("with string secret and depth=0 redacts string to small variant", () => {
      const actual = inspect(stringSecret, undefined, 0);
      assert.equal(actual, "[SecretValue(string)]");
    });

    it("with binary secret redacts to expected string", () => {
      const { Name, VersionId } = stringBinaryRes;

      const expected = `SecretValue(binary) ${inspect({ Name, VersionId })}`;
      const actual = inspect(stringBinarySecret);
      assert.equal(actual, expected);
    });

    it("with binary secret and depth=0 redacts string to small variant", () => {
      const actual = inspect(stringBinarySecret, undefined, 0);
      assert.equal(actual, "[SecretValue(binary)]");
    });
  });
});
