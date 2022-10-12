import * as ApiGateway from '../apiGateway';

describe('ApiGateway lib', () => {
  describe('apiGatewayError', () => {
    it('should return a valid Api Gateway response', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());
      const response = ApiGateway.apiGatewayError('something went wrong');
      expect(response).toStrictEqual({
        statusCode: 502,
        body: 'Internal Server Error',
        headers: {},
      });
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('apiGatewayResponse', () => {
    it('should return a valid Api Gateway string response', () => {
      const response = ApiGateway.apiGatewayResponse(200, 'all is ok');
      expect(response).toStrictEqual({
        statusCode: 200,
        body: 'all is ok',
        headers: {},
      });
    });

    it('should return a valid Api Gateway json string response', () => {
      const response = ApiGateway.apiGatewayResponse(201, { hello: 'julian' });
      expect(response).toStrictEqual({
        statusCode: 201,
        body: JSON.stringify({ hello: 'julian' }),
        headers: {},
      });
    });

    it('should return a valid Api Gateway string response with headers', () => {
      const response = ApiGateway.apiGatewayResponse(202, 'all is ok', { accept: 'all' });
      expect(response).toStrictEqual({
        statusCode: 202,
        body: 'all is ok',
        headers: { accept: 'all' },
      });
    });
  });
});
