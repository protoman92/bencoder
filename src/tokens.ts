export let delimiter = ':';
export let dict_start = 'd';
export let list_start = 'l';
export let int_start = 'i';
export let string_start = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
export let type_end = 'e';
export let delimiter_buff = (): number => Buffer.from(delimiter)[0];
export let dict_start_buff = (): number => Buffer.from(dict_start)[0];
export let list_start_buff = (): number => Buffer.from(list_start)[0];
export let int_start_buff = (): number => Buffer.from(int_start)[0];
export let string_start_buff = (): number[] => string_start.map(v => Buffer.from(v)[0]);
export let type_end_buff = (): number => Buffer.from(type_end)[0];