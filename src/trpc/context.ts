import { container, DependencyContainer } from 'tsyringe';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export interface Context {
  container: DependencyContainer;
  req: Request;
}

export const createContext = async ({
  req,
  resHeaders,
}: FetchCreateContextFnOptions): Promise<Context> => {
  return {
    container,
    req,
  };
};
