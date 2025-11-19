import { SecretsManager as AWSSecretsManager } from "@aws-sdk/client-secrets-manager";
import {
  LocalstackContainer,
  StartedLocalStackContainer,
} from "@testcontainers/localstack";
import assert from "node:assert";

const IMAGE = "localstack/localstack:4.10";

export class LocalSecretsManager {
  private localstack: StartedLocalStackContainer | null = null;
  private client: AWSSecretsManager | null = null;

  async start(): Promise<this> {
    if (this.localstack !== null) {
      return this;
    }

    this.localstack = await new LocalstackContainer(IMAGE).start();
    this.client = new AWSSecretsManager({
      endpoint: this.localstack.getConnectionUri(),
      region: "us-east-1",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    });

    return this;
  }

  async stop(): Promise<this> {
    await this.localstack?.stop();
    return this;
  }

  getClient(): AWSSecretsManager {
    assert.ok(this.client, "No client present. Did you call start()?");

    return this.client;
  }

  async createSecret(name: string, value: string): Promise<string> {
    const client = this.getClient();

    const res = await client.createSecret({
      Name: name,
      SecretString: value,
    });

    assert.ok(res.ARN, "expected ARN in response, received none");
    return res.ARN;
  }

  async createBinarySecret(name: string, value: Buffer): Promise<string> {
    const client = this.getClient();

    const res = await client.createSecret({
      Name: name,
      SecretBinary: value,
    });

    assert.ok(res.ARN, "expected ARN in response, received none");
    return res.ARN;
  }

  async [Symbol.asyncDispose]() {
    await this.stop();
  }

  private getContainer(): StartedLocalStackContainer {
    assert.ok(
      this.localstack,
      "expected localstack container. Did you call start()?",
    );

    return this.localstack;
  }
}
