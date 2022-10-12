import { AwsStub, AwsCommand } from 'aws-sdk-client-mock';
import { MetadataBearer } from '@aws-sdk/types';

export function expectCommandCalledTimes<
  TCmd extends AwsCommand<any, any>,
  TCmdInput extends TCmd extends AwsCommand<infer TIn, any> ? TIn : never,
  TInput extends object,
  TOutput extends MetadataBearer,
>(client: AwsStub<TInput, TOutput>, command: new (input: TCmdInput) => TCmd, calledTimes: number) {
  expect(client.commandCalls(command).length).toBe(calledTimes);
}

export { mockClient } from 'aws-sdk-client-mock';
