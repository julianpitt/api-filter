import { api } from '../api';
import { setupServer } from 'msw/node';
import { handlers } from '../../../../test/mockApi/handlers/unit';

const server = setupServer(...handlers);

describe('api lib', () => {
  beforeAll(() => {
    server.listen();
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    server.close();
  });

  it('should call the axios get api with the parameters passed in', async () => {
    const url = `${process.env.BASE_URL}/ok`;
    const method = 'get';
    const headers = {};

    const response = await api(url, method, headers);
    expect(response).toStrictEqual({
      data: { hello: 'world' },
      headers: { 'content-type': 'application/json', 'x-powered-by': 'msw' },
      statusCode: 200,
      statusText: 'OK',
    });
  });

  it('should call the axios post api with the parameters passed in', async () => {
    const url = `${process.env.BASE_URL}/ok`;
    const method = 'post';
    const headers = { hello: 'world' };

    const response = await api(url, method, headers);
    expect(response).toStrictEqual({
      data: { hello: 'world' },
      headers: { 'content-type': 'application/json', 'x-powered-by': 'msw' },
      statusCode: 200,
      statusText: 'OK',
    });
  });

  it('should return a 4xx error code and not throw an error', async () => {
    const url = `${process.env.BASE_URL}/404error`;
    const method = 'get';
    const headers = {};

    const response = await api(url, method, headers);
    expect(response).toStrictEqual({
      data: '',
      headers: { 'x-powered-by': 'msw' },
      statusCode: 404,
      statusText: 'Not Found',
    });
  });

  it('should return a 5xx error code and not throw an error', async () => {
    const url = `${process.env.BASE_URL}/502error`;
    const method = 'get';
    const headers = {};

    const response = await api(url, method, headers);
    expect(response).toStrictEqual({
      data: '',
      headers: { 'x-powered-by': 'msw' },
      statusCode: 502,
      statusText: 'Bad Gateway',
    });
  });

  it('should filter out unset headers', async () => {
    const url = `${process.env.BASE_URL}/echo`;
    const method = 'get';
    const headers: Record<string, any> = { hello: undefined };

    const response = await api(url, method, headers);
    expect(response).toStrictEqual({
      data: {
        qs: [],
        body: {},
        headers: {
          accept: expect.any(String),
          host: expect.any(String),
          'user-agent': expect.any(String),
        },
        method: 'GET',
      },
      headers: { 'x-powered-by': 'msw', 'content-type': 'application/json' },
      statusCode: 200,
      statusText: 'OK',
    });
  });

  it('should accept body', async () => {
    const url = `${process.env.BASE_URL}/echo`;
    const method = 'post';
    const headers: Record<string, any> = { hello: undefined };

    const response = await api(url, method, headers, undefined, { hello: 'julian' });
    expect(response).toStrictEqual({
      data: {
        qs: [],
        body: { hello: 'julian' },
        headers: {
          accept: expect.any(String),
          host: expect.any(String),
          'user-agent': expect.any(String),
          'content-type': 'application/json',
          'content-length': expect.any(String),
        },
        method: 'POST',
      },
      headers: { 'x-powered-by': 'msw', 'content-type': 'application/json' },
      statusCode: 200,
      statusText: 'OK',
    });
  });

  it('should accept query string params', async () => {
    const url = `${process.env.BASE_URL}/echo`;
    const method = 'get';
    const headers = {};

    const response = await api(url, method, headers, { hello: 'julian' });
    expect(response).toStrictEqual({
      data: {
        qs: [['hello', 'julian']],
        body: {},
        headers: {
          accept: expect.any(String),
          host: expect.any(String),
          'user-agent': expect.any(String),
        },
        method: 'GET',
      },
      headers: { 'x-powered-by': 'msw', 'content-type': 'application/json' },
      statusCode: 200,
      statusText: 'OK',
    });
  });
});
