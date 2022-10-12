import {
  AppConfigDataClient,
  GetLatestConfigurationCommand,
  GetLatestConfigurationCommandInput,
  GetLatestConfigurationCommandOutput,
  StartConfigurationSessionCommand,
  StartConfigurationSessionCommandInput,
  BadRequestException,
} from '@aws-sdk/client-appconfigdata';
import { toUtf8 } from '@aws-sdk/util-utf8-node';

export class AppConfigDataFetcher<T> {
  private client: AppConfigDataClient;
  private configuration: T;
  private nextConfigFetchEpoch?: number;
  private nextPollConfigurationToken?: string | undefined;
  private applicationNameOrId: string;
  private environmentNameOrId: string;
  private configurationProfileNameOrId: string;
  private pollIntervalInSeconds: number;
  private retryCount = 0;

  constructor(
    client: AppConfigDataClient,
    applicationNameOrId: string,
    environmentNameOrId: string,
    configurationProfileNameOrId: string,
    pollIntervalInSeconds = 60,
  ) {
    this.applicationNameOrId = applicationNameOrId;
    this.environmentNameOrId = environmentNameOrId;
    this.configurationProfileNameOrId = configurationProfileNameOrId;
    this.pollIntervalInSeconds = pollIntervalInSeconds;
    this.client = client;
  }

  private async getSessionToken(): Promise<void> {
    console.log('Starting configuration Session');
    const startSessionParams: StartConfigurationSessionCommandInput = {
      ApplicationIdentifier: this.applicationNameOrId,
      EnvironmentIdentifier: this.environmentNameOrId,
      ConfigurationProfileIdentifier: this.configurationProfileNameOrId,
      RequiredMinimumPollIntervalInSeconds: this.pollIntervalInSeconds,
    };

    const startSesssionCommand = new StartConfigurationSessionCommand(startSessionParams);
    const startSessionResult = await this.client.send(startSesssionCommand);

    this.nextPollConfigurationToken = startSessionResult.InitialConfigurationToken;
  }

  private handleConfigFetchResult(
    latestConfigurationResult: GetLatestConfigurationCommandOutput,
  ): void {
    if (latestConfigurationResult.Configuration) {
      let config: any = toUtf8(latestConfigurationResult.Configuration);
      // if there are changes to the config
      if (config.length > 0) {
        // If the config is JSON, parse the configuration
        if (
          latestConfigurationResult.ContentType &&
          latestConfigurationResult.ContentType.toLowerCase() === 'application/json'
        ) {
          config = JSON.parse(config);
        }

        this.configuration = config;
      }
    }

    this.nextConfigFetchEpoch =
      latestConfigurationResult.NextPollIntervalInSeconds !== undefined
        ? this.nowEpochInSeconds() +
          (latestConfigurationResult.NextPollIntervalInSeconds > this.pollIntervalInSeconds
            ? latestConfigurationResult.NextPollIntervalInSeconds
            : this.pollIntervalInSeconds)
        : undefined;
    this.nextPollConfigurationToken = latestConfigurationResult.NextPollConfigurationToken;
  }

  private nowEpochInSeconds(): number {
    return Math.round(Date.now() / 1000);
  }

  private shouldRefresh(): boolean {
    const now = this.nowEpochInSeconds();
    return !this.nextConfigFetchEpoch || now >= this.nextConfigFetchEpoch;
  }

  async fetchConfig(forceRefresh = false): Promise<T> {
    if (forceRefresh) {
      this.nextConfigFetchEpoch = undefined;
      this.nextPollConfigurationToken = undefined;
    }

    if (!this.shouldRefresh()) {
      console.log('Reusing cached configuration');
      return this.configuration;
    }

    if (!this.nextPollConfigurationToken) {
      await this.getSessionToken();
    }

    const latestConfigurationParams: GetLatestConfigurationCommandInput = {
      ConfigurationToken: this.nextPollConfigurationToken,
    };
    const latestConfigurationCommand = new GetLatestConfigurationCommand(latestConfigurationParams);

    try {
      console.log('Fetching configuration updates');
      const latestConfigurationResult = await this.client.send(latestConfigurationCommand);
      this.handleConfigFetchResult(latestConfigurationResult);
      this.retryCount = 0;

      return this.configuration;
    } catch (error) {
      if (error instanceof BadRequestException && this.retryCount <= 0) {
        this.retryCount++;
        return this.fetchConfig(true);
      } else {
        throw error;
      }
    }
  }
}
