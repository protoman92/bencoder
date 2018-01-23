import { Encoding } from './types';

export let delimiter = ':';
export let dict_start = 'd';
export let list_start = 'l';
export let int_start = 'i';
export let type_end = 'e';

export let delimiter_buff = (encoding: Encoding): Buffer => {
  return Buffer.from(delimiter, encoding);
};

export let dict_start_buff = (encoding: Encoding): Buffer => {
  return Buffer.from(dict_start, encoding);
};

export let list_start_buff = (encoding: Encoding): Buffer => {
  return Buffer.from(list_start, encoding);
};

export let int_start_buff = (encoding: Encoding): Buffer => {
  return Buffer.from(int_start, encoding);
};

export let type_end_buff = (encoding: Encoding): Buffer => {
  return Buffer.from(type_end, encoding);
};