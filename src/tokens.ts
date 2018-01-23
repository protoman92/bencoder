import { Encoding } from './types';

export let delimiter = ':';
export let dict_start = 'd';
export let list_start = 'l';
export let int_start = 'i';
export let string_start = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
export let type_end = 'e';

export let delimiter_buff = (encoding: Encoding): number => {
  return Buffer.from(delimiter, encoding)[0];
};

export let dict_start_buff = (encoding: Encoding): number => {
  return Buffer.from(dict_start, encoding)[0];
};

export let list_start_buff = (encoding: Encoding): number => {
  return Buffer.from(list_start, encoding)[0];
};

export let int_start_buff = (encoding: Encoding): number => {
  return Buffer.from(int_start, encoding)[0];
};

export let string_start_buff = (encoding: Encoding): number[] => {
  return string_start.map(v => Buffer.from(v, encoding)[0]);
};

export let type_end_buff = (encoding: Encoding): number => {
  return Buffer.from(type_end, encoding)[0];
};