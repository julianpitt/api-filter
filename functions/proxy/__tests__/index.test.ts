import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import {
  AppConfigDataClient,
  GetLatestConfigurationCommand,
  StartConfigurationSessionCommand,
} from '@aws-sdk/client-appconfigdata';
import { fromUtf8 } from '@aws-sdk/util-utf8-node';
import { setupServer } from 'msw/node';

// Test file imports
import * as Proxy from '../index';
import * as config from './testConfig.json';
import * as cases from './testCases.json';
import { rest } from 'msw';

const appConfigDataMock = mockClient(AppConfigDataClient);

describe('Proxy', () => {
  const env = process.env;
  const server = setupServer();

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    appConfigDataMock.reset();

    appConfigDataMock.on(StartConfigurationSessionCommand).resolves({
      InitialConfigurationToken: 'fake-token',
    });

    appConfigDataMock.on(GetLatestConfigurationCommand).resolves({
      NextPollIntervalInSeconds: 100,
      NextPollConfigurationToken: 'fake-next-token',
      ContentType: 'application/json',
      Configuration: fromUtf8(JSON.stringify({ ...config, baseUrl: process.env['BASE_URL'] })),
    });

    process.env = {
      ...env,
      configLocation: 'AppConfig',
      configApplicationName: 'FakeApplication',
      configEnvName: 'dev',
      configProfileName: 'functionConfig',
    };
  });

  afterEach(() => {
    process.env = env;
    server.resetHandlers();
  });

  cases.forEach(({ httpMethod, path, nonFiltered, filtered }) => {
    it(`should filter out ${httpMethod} ${path} responses if match route found`, async () => {
      // Set up the data for the downstream server to respond with
      server.use(
        rest[httpMethod.toLowerCase() as keyof typeof rest](
          `${process.env.BASE_URL}${path}`,
          (req, res, ctx) => {
            return res(
              ctx.status(200),
              ctx.body(JSON.stringify(nonFiltered)),
              ctx.set('Content-Type', 'application/json'),
            );
          },
        ),
      );

      // Prepare the  function event from API Gateway
      const event = {
        httpMethod,
        path,
      } as APIGatewayProxyEvent;

      const response = await Proxy.handler(event, {} as Context, undefined as any);
      if (!response) {
        fail('missing response');
      }

      expect(response.statusCode).toBe(200);
      const JSONResponse = JSON.parse(response.body);
      expect(JSONResponse).toStrictEqual(filtered);
    });
  });
});
