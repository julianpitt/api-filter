export function apiGatewayError(reason: string) {
  console.log(reason);
  return apiGatewayResponse(502, 'Internal Server Error');
}

const isObjectOrArray = (variable: any) => typeof variable === 'object' && variable !== null;

export function apiGatewayResponse(
  statusCode: number,
  body: string | Record<string, any>,
  headers = {} as Record<string, string>,
) {
  let stringBody = body;
  if (isObjectOrArray(body)) {
    stringBody = JSON.stringify(body);
  }

  return {
    statusCode,
    body: `${stringBody}`,
    headers,
  };
}
