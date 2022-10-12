import Axios, { AxiosRequestHeaders } from 'axios';

export async function api(
  url: string,
  method: string,
  headers: Record<string, string | undefined>,
  params?: any,
  data?: any,
) {
  let filteredHeaders: AxiosRequestHeaders | undefined;

  if (headers) {
    filteredHeaders = {} as AxiosRequestHeaders;
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        filteredHeaders[key] = value;
      }
    }
  }

  const result = await Axios({
    method,
    url,
    headers: filteredHeaders,
    params: params,
    data: data,
    validateStatus: function () {
      return true;
    },
  });

  return {
    data: result.data,
    headers: result.headers,
    statusCode: result.status,
    statusText: result.statusText,
  };
}
