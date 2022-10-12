import { AppConfigDataFetcher } from './appConfig';
import { AppConfigDataClient } from '@aws-sdk/client-appconfigdata';
import { Tracer } from '@aws-lambda-powertools/tracer';

let appConfigInstance: AppConfigDataFetcher<ApplicationConfig>;
let gloablTracer: Tracer | undefined;

export type ApplicationConfig = {
  baseUrl: string;
  filters: { method: string; path: string; filterPaths: string[] }[];
  errorOnMissingKey: boolean;
};

export async function fetchConfig(tracer?: Tracer): Promise<ApplicationConfig> {
  gloablTracer = tracer;
  console.log('Fetching Application Configuration');
  const { configLocation } = process.env;

  if (configLocation === undefined) {
    throw new Error('missing required env var configLocation');
  }

  switch (configLocation) {
    case 'AppConfig': {
      const { configApplicationName, configEnvName, configProfileName } = process.env;

      if (!configApplicationName) {
        throw new Error(`missing required env var configApplicationName`);
      }

      if (!configEnvName) {
        throw new Error(`missing required env var configEnvName`);
      }

      if (!configProfileName) {
        throw new Error(`missing required env var configProfileName`);
      }

      return fetchConfigFromAppConfig(configApplicationName, configEnvName, configProfileName);
    }
    default:
      throw new Error(`unsupported configLocation option provided "${configLocation}"`);
  }
}

async function fetchConfigFromAppConfig(
  applicationName: string,
  envName: string,
  profileName: string,
): Promise<ApplicationConfig> {
  let client = new AppConfigDataClient({});

  if (gloablTracer) {
    client = gloablTracer.captureAWSv3Client(client);
  }

  if (!appConfigInstance) {
    appConfigInstance = new AppConfigDataFetcher<ApplicationConfig>(
      client,
      applicationName,
      envName,
      profileName,
    );
  }

  const config = await appConfigInstance.fetchConfig();

  validateConfig(config);

  return config;
}

function validateConfig(config: Record<string, any>) {
  if (config.baseUrl === undefined) {
    throw new Error('missing baseUrl in application config');
  }

  if (config.errorOnMissingKey === undefined) {
    throw new Error('missing errorOnMissingKey in application config');
  }

  if (config.filters === undefined) {
    throw new Error('missing filters in application config');
  }
}
