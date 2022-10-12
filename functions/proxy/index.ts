import type { APIGatewayProxyHandler } from 'aws-lambda';
import { api } from './libs/api';
import { apiGatewayResponse } from './libs/apiGateway';
import { ApplicationConfig, fetchConfig } from './libs/config';
import { ResponseFilter } from './libs/filter';
import * as MiddyTypes from '@middy/core';
const middy = require('@middy/core') as typeof MiddyTypes.default;
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';

const tracer = new Tracer({ serviceName: 'proxyFunction', captureHTTPsRequests: true });

let coldStart = true;

function getResponseFilter(config: ApplicationConfig) {
  const responseFilter = new ResponseFilter({
    errorOnMissingKey: config.errorOnMissingKey,
  });

  config.filters.forEach(({ method, path, filterPaths }) => {
    responseFilter.addFilter(method, path, filterPaths);
  });

  return responseFilter;
}

export const lambdaHandler: APIGatewayProxyHandler = async event => {
  console.log(coldStart ? 'Fresh instance' : 'Reused instance');
  coldStart = false;

  // Ensure the function has been initialized and the config has been fetched
  const config = await fetchConfig(tracer);

  // Extract the relevant fields from the api call
  const method = event.httpMethod;
  const path = event.path;
  const qsp = event.queryStringParameters || undefined;
  const body = event.body || undefined;
  const headers = event.headers || undefined;

  if (headers && headers['Accept-Encoding']) delete headers['Accept-Encoding'];
  if (headers && headers['Host']) delete headers['Host'];

  // Call the downstream API
  let result: Awaited<ReturnType<typeof api>>;
  try {
    console.log(`Calling ${config.baseUrl} ${path} ${method}`);
    result = await api(`${config.baseUrl}${path}`, method, headers, qsp, body);
  } catch (e) {
    console.error(e);
    return apiGatewayResponse(502, 'Unknown Error');
  }

  let responseBody = result.data;

  // Filter the results
  if (
    result.statusCode >= 200 &&
    result.statusCode < 400 &&
    result.headers['content-type'].indexOf('application/json') > -1
  ) {
    responseBody = getResponseFilter(config).filterResult(method, path, responseBody);
  }

  // Return the response
  return apiGatewayResponse(result.statusCode, responseBody, result.headers);
};

export const handler = middy(lambdaHandler).use(captureLambdaHandler(tracer));
