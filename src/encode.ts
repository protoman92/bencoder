import { JSObject, Objects, Try } from 'javascriptutilities';
import * as Tokens from './tokens';
import { Bencodable, BencodablePrimitive, Encoding } from './types';
import * as Types from './types';

/**
 * Bencode a boolean.
 * @param {boolean} boolean A boolean value.
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encodeBoolean = (boolean: boolean, encoding: Encoding): Try<Buffer> => {
  return encodeInt(boolean ? 1 : 0, encoding);
};

/**
 * Bencode an integer.
 * @param {number} number A number value.
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encodeInt = (number: number, encoding: Encoding): Try<Buffer> => {
  return Try.success(number)
    .filter(v => v >= 0, v => `${v} is negative`)
    .filter(v => Number.isInteger(v), v => `${v} is not an integer`)
    .map(v => {
      let start = Tokens.int_start;
      let end = Tokens.type_end;
      return Buffer.from(start + v + end, encoding);
    });
};

/**
 * Bencode a string.
 * @param {string} text A string value.
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Buffer} A Buffer instance.
 */
export let encodeString = (text: string, encoding: Encoding): Buffer => {
  return Buffer.from(text.length + ':' + text, encoding);
};

/**
 * Bencode a primitive value.
 * @param {BencodablePrimitive} primitive A BencodablePrimitive value.
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encodePrimitive = (primitive: BencodablePrimitive, encoding: Encoding): Try<Buffer> => {
  if (typeof primitive === 'string') {
    return Try.success(encodeString(primitive, encoding));
  } else if (typeof primitive === 'number') {
    return encodeInt(primitive, encoding);
  } else {
    return encodeBoolean(primitive, encoding);
  }
};

/**
 * Bencode an Array.
 * @param {Bencodable[]} array An Array of Bencodable.
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer[]>} A Try Buffer Array instance.
 */
export let encodeArray = (array: Bencodable[], encoding: Encoding): Try<Buffer[]> => {
  let pre = Buffer.from(Tokens.list_start, encoding);
  let post = Buffer.from(Tokens.type_end, encoding);

  return array.map(v => encode(v, encoding))
    .reduce((v1, v2) => {
      return v1.zipWith(v2, (a, b) => a.concat([b]));
    }, Try.success<Buffer[]>([]))
    .map(v => [pre].concat(v).concat([post]));
};

/**
 * Bencode a Map.
 * @param {Map<string,Bencodable>} map A Map instance.
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer[]>} A Try Buffer Array instance.
 */
export let encodeMap = (map: Map<string,Bencodable>, encoding: Encoding): Try<Buffer[]> => {
  let pre = Buffer.from(Tokens.dict_start, encoding);
  let post = Buffer.from(Tokens.type_end, encoding);
  let keys = Array.from(map.keys()).sort();
  var buffers: Try<Buffer>[] = [];

  for (let key of keys) {
    let value = Try.unwrap(map.get(key), `Missing value for key ${key}`);
    let keyBuffer = encodeString(key, encoding);
    let valueBuffer = value.flatMap(v => encode(v, encoding));
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
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer[]>} A Try Buffer Array instance.
 */
export let encodeKVObject = (obj: JSObject<BencodablePrimitive>, encoding: Encoding): Try<Buffer[]> => {
  return encodeMap(Objects.toMap(obj), encoding);
};

/**
 * Bencode an object.
 * @param {Bencodable} obj A Bencodable instance.
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encode = (obj: Bencodable, encoding: Encoding): Try<Buffer> => {
  var buffers: Try<Buffer[]>;

  if (Types.isBencodablePrimitive(obj)) {
    buffers = encodePrimitive(obj, encoding).map(v => [v]);
  } else if (obj instanceof Array) {
    buffers = encodeArray(obj, encoding);
  } else if (obj instanceof Map) {
    buffers = encodeMap(obj, encoding);
  } else {
    buffers = encodeKVObject(obj, encoding);
  }

  return buffers.map(v => Buffer.concat(v));
};