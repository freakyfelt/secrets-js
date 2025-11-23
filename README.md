# @freakyfelt/secrets-js

Provides a wrapper around AWS Secrets Manager for safely accessing secrets

## Goals

AWS Secrets Manager allows you to centrally store and rotate versioned secrets and manage access using standard AWS IAM policies. While powerful, there is still some hand holding that has to be done if fetching secrets in-process.

Some goals:

* **Keep it secure**
  * use native JS private fields to prevent accidental console output
  * return copies of data (especially objects/arrays) to avoid poisoning
  * do not let exceptions bubble up where secret material is present
* **Keep it natural**: make fetching secrets as easy as using `fetch()`
  * includes `text()`, `json()`, and `bytes()` methods with safer exception handling
  * handles switching between `SecretString` and `SecretBinary` where possible
* **Keep it simple**: aim to keep layers of indirection minimal
  * Keep variable names close to the same (e.g. use `SecretId` when the API field is `SecretId`)
  * Let AWS-provided exceptions bubble up when safe to do so
  * Provides the `raw()` response for cases where the underlying command output is needed

## Getting started

You will need to create an instance of `SecretsFetcher` with an `@aws-sdk/client-secrets-manager` client instance:

```typescript
import { SecretsManager } from '@aws-sdk/client-secrets-manager'
import { SecretsFetcher } from '@freakyfelt/secrets-js'

const secretsFetcher = new SecretsFetcher(new SecretsManager());
```

### Fetching and using a secret

Once initialized you are able to call the `fetch()` method with the ARN of the secret you wish to fetch, returning a [SecretValue](./src/secret-value.ts) object if the secret was fetched successfully.

```typescript
// returns a SecretValue
const dbCreds = await secretsFetcher.fetch("arn:aws:secretsmanager:us-east-1:01234567890:secret:my_project/test/pg_credentials-1a2b3c");

// Will output "SecretValue(string) { Name: "...", VersionId: "..." }" instead of the raw input object
console.log(dbCreds)
dbCreds.ARN // => "arn:aws:secretsmanager:us-east-1:01234567890:secret:my_project/test/pg_credentials-1a2b3c"
dbCreds.Name // => "my_project/test/pg_credentials"
dbCreds.VersionId // => "${uuid}"
dbCreds.VersionStages // => ["AWSCURRENT"]
dbCreds.CreatedDate // => Date

// "string" if the secret was stored as a string, "binary" if the secret was stored as a binary
dbCreds.payloadType // => "string"

// text() returns the text from the `SecretString` field
const str = await dbCreds.text();

// json() method parses the `SecretString` field to JSON or safely throws a SecretParseError with only the ARN if unparseable
const { hostname, username, password } = await dbCreds.json(); // => SecretParseError("Could not parse secret as JSON", { arn })

// bytes() returns a Buffer for cases such as X.509 certificates. Will also convert string secrets to a buffer
const buf = await dbCreds.bytes();
```

### Utility methods: `fetchString()` and `fetchJson()`

For basic fetch needs the library includes `fetchString()` and `fetchJson()` methods that handle unwrapping the `SecretValue` and returning the raw value.

```typescript
const dbPassword = await fetcher.fetchString(dbPasswordArn); // => returns the string value directly instead of a SecretValue
const { hostname, username, password } = await fetcher.fetchJson(dbCredsArn);
```

## Advanced topics

The library aims to be a lightweight wrapper to allow for escape hatches when needed.

### Passing additional arguments

By default the `fetch()` method and its cohorts work fine with only providing the `SecretId` as positional argument 1. More advanced use cases for secret rotation may require providing [other fields][aws:getsecretvalue], such as the `VersionId` or `VersionStage`. These can be provided in a second argument and will be combined with the `SecretId` in the request:

```typescript
const awsPrevious = await secretsFetcher.fetch(arn, { VersionStage: "AWSPREVIOUS" });
// same as not specifying the version stage
const awsCurrent = await secretsFetcher.fetch(arn, { VersionStage: "AWSCURRENT" });
// fetch a pinned version of a secret using its VersionId
const pinnedVersion = await secretsFetcher.fetch(arn, { VersionId: versionId });
```

### Working with version stages 

SecretValue includes some helper methods work with VersionStages:

- `SecretValue#isAWSCurrent()`: Returns true if the secret is the current version.
- `SecretValue#isAWSPrevious()`: Returns true if the secret is the previous version.
- `SecretValue#isAWSPending()`: Returns true if the secret is pending rotation.
- `SecretValue#hasVersionStage(stage)`: Returns true if the secret has the specified version stage.

[aws:getsecretvalue]: https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
