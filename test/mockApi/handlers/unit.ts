import { DefaultBodyType, MockedRequest, rest, RestHandler } from 'msw';

export const handlers: RestHandler<MockedRequest<DefaultBodyType>>[] = [];

handlers.push(
  rest.get(`${process.env.BASE_URL}/ok`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.body(JSON.stringify({ hello: 'world' })),
      ctx.set('Content-Type', 'application/json'),
    );
  }),

  rest.post(`${process.env.BASE_URL}/ok`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.body(JSON.stringify({ hello: 'world' })),
      ctx.set('Content-Type', 'application/json'),
    );
  }),

  rest.all(`${process.env.BASE_URL}/echo`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.body(
        JSON.stringify({
          body: req.body || {},
          qs: Array.from(req.url.searchParams.entries()),
          headers: req.headers.all(),
          method: req.method,
        }),
      ),
      ctx.set('Content-Type', 'application/json'),
    );
  }),

  rest.get(`${process.env.BASE_URL}/502error`, (req, res, ctx) => {
    return res(ctx.status(502));
  }),

  rest.get(`${process.env.BASE_URL}/404error`, (req, res, ctx) => {
    return res(ctx.status(404));
  }),
);
