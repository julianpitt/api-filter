import {
  AppConfigDataClient,
  BadRequestException,
  GetLatestConfigurationCommand,
  StartConfigurationSessionCommand,
} from '@aws-sdk/client-appconfigdata';
import { fromUtf8 } from '@aws-sdk/util-utf8-node';
import { AppConfigDataFetcher } from '../appConfig';
import { advanceBy } from 'jest-date-mock';
import { expectCommandCalledTimes, mockClient } from '../../../../test/helpers/awsMockHelpers';
const appConfigDataMock = mockClient(AppConfigDataClient);

type TestConfig = {
  name: string;
  age: number;
  isOk: boolean;
  afterDelay?: string;
};

describe('AppConfig', () => {
  const consoleLogSpy = jest.spyOn(console, 'log');
  beforeAll(() => {
    consoleLogSpy.mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  beforeEach(() => {
    appConfigDataMock.reset();

    appConfigDataMock.on(StartConfigurationSessionCommand).resolves({
      InitialConfigurationToken: 'fake-token',
    });
  });

  it('should accept a client and return config on an interval', async () => {
    const outputConfig: TestConfig = {
      name: 'Julian',
      age: 30,
      isOk: true,
    };
    const udpatedOutputConfig: TestConfig = { afterDelay: 'hi', ...outputConfig };

    const applicationId = 'FakeApp';
    const environmentId = 'Fake Env';
    const configProfile = 'Fake profile';

    appConfigDataMock.on(GetLatestConfigurationCommand).resolves({
      NextPollIntervalInSeconds: 0,
      NextPollConfigurationToken: 'fake-next-token',
      ContentType: 'application/json',
      Configuration: fromUtf8(JSON.stringify(outputConfig)),
    });

    const client = new AppConfigDataClient({});

    const configManager = new AppConfigDataFetcher<TestConfig>(
      client,
      applicationId,
      environmentId,
      configProfile,
    );

    const firstFetchedConfig = await configManager.fetchConfig();
    expect(firstFetchedConfig).toStrictEqual(outputConfig);

    advanceBy(5 * 1000); // move time forward 5 seconds

    appConfigDataMock.on(GetLatestConfigurationCommand).resolves({
      NextPollIntervalInSeconds: 0,
      NextPollConfigurationToken: 'fake-next-token',
      ContentType: 'application/json',
      Configuration: fromUtf8(JSON.stringify(udpatedOutputConfig)),
    });

    const secondFetchedConfig = await configManager.fetchConfig();
    expect(secondFetchedConfig).toStrictEqual(outputConfig);

    advanceBy(56 * 1000); // move time forward 56 seconds

    const thirdFetchedConfig = await configManager.fetchConfig();
    expect(thirdFetchedConfig).toStrictEqual(udpatedOutputConfig);

    expectCommandCalledTimes(appConfigDataMock, StartConfigurationSessionCommand, 1);
    expectCommandCalledTimes(appConfigDataMock, GetLatestConfigurationCommand, 2);
  });

  it('should accept a client and return config past the timeout', async () => {
    const outputConfig: TestConfig = {
      name: 'Julian',
      age: 30,
      isOk: true,
    };
    const udpatedOutputConfig: TestConfig = { afterDelay: 'hi', ...outputConfig };

    const applicationId = 'FakeApp';
    const environmentId = 'Fake Env';
    const configProfile = 'Fake profile';

    appConfigDataMock.on(GetLatestConfigurationCommand).resolves({
      NextPollIntervalInSeconds: 100,
      NextPollConfigurationToken: 'fake-next-token',
      ContentType: 'application/json',
      Configuration: fromUtf8(JSON.stringify(outputConfig)),
    });

    const client = new AppConfigDataClient({});

    const configManager = new AppConfigDataFetcher<TestConfig>(
      client,
      applicationId,
      environmentId,
      configProfile,
    );

    const firstFetchedConfig = await configManager.fetchConfig();
    expect(firstFetchedConfig).toStrictEqual(outputConfig);

    advanceBy(5 * 1000); // move time forward 5 seconds

    appConfigDataMock.on(GetLatestConfigurationCommand).resolves({
      NextPollIntervalInSeconds: 100,
      NextPollConfigurationToken: 'fake-next-token',
      ContentType: 'application/json',
      Configuration: fromUtf8(JSON.stringify(udpatedOutputConfig)),
    });

    const secondFetchedConfig = await configManager.fetchConfig();
    expect(secondFetchedConfig).toStrictEqual(outputConfig);

    advanceBy(56 * 1000); // move time forward 56 seconds total of 60

    const thirdFetchedConfig = await configManager.fetchConfig();
    expect(thirdFetchedConfig).toStrictEqual(outputConfig);

    advanceBy(40 * 1000); // move time forward 40 seconds total of 100

    const fourthFetchedConfig = await configManager.fetchConfig();
    expect(fourthFetchedConfig).toStrictEqual(udpatedOutputConfig);

    expectCommandCalledTimes(appConfigDataMock, StartConfigurationSessionCommand, 1);
    expectCommandCalledTimes(appConfigDataMock, GetLatestConfigurationCommand, 2);
  });

  it('should refresh the session token on a BadRequestException', async () => {
    const outputConfig: TestConfig = {
      name: 'Julian',
      age: 30,
      isOk: true,
    };

    const applicationId = 'FakeApp';
    const environmentId = 'Fake Env';
    const configProfile = 'Fake profile';

    appConfigDataMock
      .on(GetLatestConfigurationCommand)
      .resolvesOnce({
        NextPollIntervalInSeconds: 0,
        NextPollConfigurationToken: 'fake-next-token',
        ContentType: 'application/json',
        Configuration: fromUtf8(JSON.stringify(outputConfig)),
      })
      .rejectsOnce(new BadRequestException({ $metadata: {}, message: 'error' }))
      .resolves({
        NextPollIntervalInSeconds: 100,
        NextPollConfigurationToken: 'fake-next-token',
        ContentType: 'application/json',
        Configuration: fromUtf8(JSON.stringify(outputConfig)),
      });

    const client = new AppConfigDataClient({});

    const configManager = new AppConfigDataFetcher<TestConfig>(
      client,
      applicationId,
      environmentId,
      configProfile,
    );

    const firstFetchedConfig = await configManager.fetchConfig();
    expect(firstFetchedConfig).toStrictEqual(outputConfig);

    advanceBy(65 * 1000); // move time forward 5 seconds
    expectCommandCalledTimes(appConfigDataMock, StartConfigurationSessionCommand, 1);
    expectCommandCalledTimes(appConfigDataMock, GetLatestConfigurationCommand, 1);

    const secondFetchedConfig = await configManager.fetchConfig();
    expect(secondFetchedConfig).toStrictEqual(outputConfig);

    expectCommandCalledTimes(appConfigDataMock, StartConfigurationSessionCommand, 2);
    expectCommandCalledTimes(appConfigDataMock, GetLatestConfigurationCommand, 3);
  });

  it('should throw the error if BadRequestException occurs twice', async () => {
    const applicationId = 'FakeApp';
    const environmentId = 'Fake Env';
    const configProfile = 'Fake profile';

    appConfigDataMock
      .on(GetLatestConfigurationCommand)
      .rejects(new BadRequestException({ $metadata: {}, message: 'error' }));

    const client = new AppConfigDataClient({});

    const configManager = new AppConfigDataFetcher<TestConfig>(
      client,
      applicationId,
      environmentId,
      configProfile,
    );

    await expect(() => configManager.fetchConfig()).rejects.toThrowError(BadRequestException);

    expectCommandCalledTimes(appConfigDataMock, StartConfigurationSessionCommand, 2);
    expectCommandCalledTimes(appConfigDataMock, GetLatestConfigurationCommand, 2);
  });

  it('should throw unexpected errors', async () => {
    const applicationId = 'FakeApp';
    const environmentId = 'Fake Env';
    const configProfile = 'Fake profile';

    appConfigDataMock.on(GetLatestConfigurationCommand).rejects(new Error('error'));

    const client = new AppConfigDataClient({});

    const configManager = new AppConfigDataFetcher<TestConfig>(
      client,
      applicationId,
      environmentId,
      configProfile,
    );

    await expect(() => configManager.fetchConfig()).rejects.toThrowError();

    expectCommandCalledTimes(appConfigDataMock, StartConfigurationSessionCommand, 1);
    expectCommandCalledTimes(appConfigDataMock, GetLatestConfigurationCommand, 1);
  });
});
