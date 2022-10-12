import * as configLib from '../config';
import { mockClient } from 'aws-sdk-client-mock';
import { AppConfigDataClient } from '@aws-sdk/client-appconfigdata';
import { AppConfigDataFetcher } from '../appConfig';
const appConfigDataMock = mockClient(AppConfigDataClient);

describe('config lib', () => {
  const consoleLogSpy = jest.spyOn(console, 'log');

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  beforeAll(() => {
    consoleLogSpy.mockImplementation();
  });
  afterAll(() => {
    consoleLogSpy.mockRestore();
  });
  describe('fetchConfig', () => {
    const appConfigClientSpy = jest.spyOn(AppConfigDataFetcher.prototype, 'fetchConfig');

    describe('AppConfig', () => {
      it('should throw an error if there is no application name', () => {
        const initialEnv = { ...process.env };

        process.env = {
          ...initialEnv,
          configLocation: 'AppConfig',
        };

        expect(() => configLib.fetchConfig()).rejects.toThrowError();

        process.env = initialEnv;
      });

      it('should throw an error if there is no env', () => {
        const initialEnv = { ...process.env };

        process.env = {
          ...initialEnv,
          configLocation: 'AppConfig',
          configApplicationName: 'my application',
        };

        expect(() => configLib.fetchConfig()).rejects.toThrowError();

        process.env = initialEnv;
      });

      it('should throw an error if there is no profile name', () => {
        const initialEnv = { ...process.env };

        process.env = {
          ...initialEnv,
          configLocation: 'AppConfig',
          configApplicationName: 'my application',
          configEnvName: 'env',
        };

        expect(() => configLib.fetchConfig()).rejects.toThrowError();

        process.env = initialEnv;
      });

      it('should call appconfig Lib to get config and return', async () => {
        const initialEnv = { ...process.env };

        process.env = {
          ...initialEnv,
          configLocation: 'AppConfig',
          configApplicationName: 'my application',
          configEnvName: 'env',
          configProfileName: 'profile name',
        };

        const returnValue = {
          baseUrl: 'https://test.com',
          errorOnMissingKey: false,
          filters: [''],
        };

        appConfigClientSpy.mockResolvedValue(returnValue);

        const response = await configLib.fetchConfig();
        expect(response).toBe(returnValue);

        process.env = initialEnv;
      });

      it('should call appconfig Lib to get config and throw an error for missing baseUrl', async () => {
        const initialEnv = { ...process.env };

        process.env = {
          ...initialEnv,
          configLocation: 'AppConfig',
          configApplicationName: 'my application',
          configEnvName: 'env',
          configProfileName: 'profile name',
        };

        const returnValue = {
          errorOnMissingKey: false,
          filters: [''],
        };

        appConfigClientSpy.mockResolvedValue(returnValue);

        expect(() => configLib.fetchConfig()).rejects.toThrowError(/baseUrl/i);

        process.env = initialEnv;
      });

      it('should call appconfig Lib to get config and throw an error for missing errorOnMissingKey', async () => {
        const initialEnv = { ...process.env };

        process.env = {
          ...initialEnv,
          configLocation: 'AppConfig',
          configApplicationName: 'my application',
          configEnvName: 'env',
          configProfileName: 'profile name',
        };

        const returnValue = {
          baseUrl: 'https://test.com',
          filters: [''],
        };

        appConfigClientSpy.mockResolvedValue(returnValue);

        expect(() => configLib.fetchConfig()).rejects.toThrowError(/errorOnMissingKey/i);

        process.env = initialEnv;
      });

      it('should call appconfig Lib to get config and throw an error for missing filters', async () => {
        const initialEnv = { ...process.env };

        process.env = {
          ...initialEnv,
          configLocation: 'AppConfig',
          configApplicationName: 'my application',
          configEnvName: 'env',
          configProfileName: 'profile name',
        };

        const returnValue = {
          errorOnMissingKey: false,
          baseUrl: 'https://test.com',
        };

        appConfigClientSpy.mockResolvedValue(returnValue);

        expect(() => configLib.fetchConfig()).rejects.toThrowError(/filters/i);

        process.env = initialEnv;
      });
    });

    it('should throw an error if no config type is passed in', () => {
      expect(() => configLib.fetchConfig()).rejects.toThrowError();
    });

    it('should throw an error if an unsupported config type is passed in', () => {
      const initialEnv = { ...process.env };

      process.env = {
        ...initialEnv,
        configLocation: 'Something Else',
      };

      expect(() => configLib.fetchConfig()).rejects.toThrowError();

      process.env = initialEnv;
    });
  });
});
