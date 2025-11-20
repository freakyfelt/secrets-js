import { GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";
import assert from "node:assert";
import { describe, it } from "node:test";
import { toGetSecretResponse } from "../../test/fixtures.ts";
import { toSafeSecretFields } from "./safe-secret-fields.ts";

describe("toSafeSecretFields", () => {
  it("returns an empty object when input is an empty object", () => {
    assert.deepStrictEqual(toSafeSecretFields({}), {});
  });

  it("only returns allowed fields if they're defined on the input object", () => {
    const input: GetSecretValueResponse = {};
    const actual = toSafeSecretFields(input);
    assert.deepStrictEqual(actual, {});
  });

  it("returns expected fields with a full GetSecretValueResponse provided", () => {
    const input: GetSecretValueResponse = toGetSecretResponse(
      "example/test/string",
      "hello world",
    );
    assert.ok(input.ARN);
    assert.ok(input.Name);
    assert.ok(input.VersionId);
    assert.ok(input.VersionStages);
    assert.ok(input.SecretString);
    assert.ok(input.CreatedDate);

    const actual = toSafeSecretFields(input);
    assert.deepStrictEqual(actual, {
      Name: input.Name,
      VersionId: input.VersionId,
    });
  });
});
