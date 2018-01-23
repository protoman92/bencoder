import { JSObject, Objects, Try } from 'javascriptutilities';
import * as Tokens from './tokens';
import { Bencodable, BencodablePrimitive } from './types';
import * as Types from './types';

/**
 * Bencode a boolean.
 * @param {boolean} boolean A boolean value.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encodeBoolean = (boolean: boolean): Try<Buffer> => {
  return encodeInt(boolean ? 1 : 0);
};

/**
 * Bencode an integer.
 * @param {number} number A number value.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encodeInt = (number: number): Try<Buffer> => {
  return Try.success(number)
    .filter(v => v >= 0, v => `${v} is negative`)
    .filter(v => Number.isInteger(v), v => `${v} is not an integer`)
    .map(v => {
      let start = Tokens.int_start;
      let end = Tokens.type_end;
      return Buffer.from(start + v + end);
    });
};

/**
 * Bencode a string.
 * @param {string} text A string value.
 * @returns {Buffer} A Buffer instance.
 */
export let encodeString = (text: string): Buffer => {
  return Buffer.from(text.length + ':' + text);
};

/**
 * Bencode a primitive value.
 * @param {BencodablePrimitive} primitive A BencodablePrimitive value.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encodePrimitive = (primitive: BencodablePrimitive): Try<Buffer> => {
  if (typeof primitive === 'string') {
    return Try.success(encodeString(primitive));
  } else if (typeof primitive === 'number') {
    return encodeInt(primitive);
  } else {
    return encodeBoolean(primitive);
  }
};

/**
 * Bencode an Array.
 * @param {Bencodable[]} array An Array of Bencodable. 
 * @returns {Try<Buffer[]>} A Try Buffer Array instance.
 */
export let encodeArray = (array: Bencodable[]): Try<Buffer[]> => {
  let pre = Buffer.from(Tokens.list_start);
  let post = Buffer.from(Tokens.type_end);

  return array.map(v => encode(v))
    .reduce((v1, v2) => {
      return v1.zipWith(v2, (a, b) => a.concat([b]));
    }, Try.success<Buffer[]>([]))
    .map(v => [pre].concat(v).concat([post]));
};

/**
 * Bencode a Map.
 * @param {Map<string,Bencodable>} map A Map instance.
 * @returns {Try<Buffer[]>} A Try Buffer Array instance.
 */
export let encodeMap = (map: Map<string,Bencodable>): Try<Buffer[]> => {
  let pre = Buffer.from(Tokens.dict_start);
  let post = Buffer.from(Tokens.type_end);
  let keys = Array.from(map.keys()).sort();
  var buffers: Try<Buffer>[] = [];

  for (let key of keys) {
    let value = Try.unwrap(map.get(key), `Missing value for key ${key}`);
    let keyBuffer = encodeString(key);
    let valueBuffer = value.flatMap(v => encode(v));
    buffers.push(Try.success(keyBuffer));
    buffers.push(valueBuffer);
  }

  return buffers
    .reduce((v1, v2) => {
      return v1.zipWith(v2, (a, b) => a.concat([b]));
    }, Try.success<Buffer[]>([]))
    .map(v => [pre].concat(v).concat(post));
};

/**
 * Bencode a key-value object. 
 * @param {JSObject<BencodablePrimitive>} obj A JSObject instance.
 * @returns {Try<Buffer[]>} A Try Buffer Array instance.
 */
export let encodeKVObject = (obj: JSObject<BencodablePrimitive>): Try<Buffer[]> => {
  return encodeMap(Objects.toMap(obj));
};

/**
 * Bencode an object.
 * @param {Bencodable} obj A Bencodable instance.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encode = (obj: Bencodable): Try<Buffer> => {
  var buffers: Try<Buffer[]>;

  if (Types.isBencodablePrimitive(obj)) {
    buffers = encodePrimitive(obj).map(v => [v]);
  } else if (obj instanceof Array) {
    buffers = encodeArray(obj);
  } else if (obj instanceof Map) {
    buffers = encodeMap(obj);
  } else {
    buffers = encodeKVObject(obj);
  }

  return buffers.map(v => Buffer.concat(v));
};