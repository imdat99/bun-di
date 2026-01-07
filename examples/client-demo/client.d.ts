import { Hono } from 'hono';
import type { InferRequestType, InferResponseType } from 'hono/client';

export interface CreateCatDto {
  name: string;
  age: number;
}

export type AppType = Hono<any, {
  '/cats': {
    $get: {
      input: { query: { name?: string | undefined; age?: number | undefined; } },
      output: { json: { id: string; name: string; age: number; }[] },
      outputFormat: 'json',
      status: 200
    },
    $post: {
      input: { json: CreateCatDto },
      output: { json: { id: string; name: string; age: number; } },
      outputFormat: 'json',
      status: 200
    },
  },
  '/cats/:id': {
    $get: {
      input: { param: { id: string } },
      output: { json: { id: string; name: string; age: number; } | undefined },
      outputFormat: 'json',
      status: 200
    },
    $delete: {
      input: { param: { id: string } },
      output: { json: { id: string; } },
      outputFormat: 'json',
      status: 200
    },
    $put: {
      input: { json: CreateCatDto, param: { id: string } },
      output: { json: { id: string; name: string; age: number; } },
      outputFormat: 'json',
      status: 200
    },
  },
}>;
