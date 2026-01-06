import { Type } from '../interfaces';

export type InjectionToken = string | symbol | Type<any> | Function;
