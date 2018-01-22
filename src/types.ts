import { Indeterminate, JSObject } from 'javascriptutilities';

export type Encoding = Indeterminate<string>;

/// Represents all primitive types that can be bencoded.
export type BencodablePrimitive = boolean | ByteString | number;

/// Represents all the types that can be bencoded.
export type Bencodable =
  any[] |
  BencodablePrimitive |
  JSObject<any> |
  Map<string,any>;

/**
 * Check if an object is a bencodable primitive.
 * @param {*} obj Any object.
 * @returns {boolean} A boolean value.
 */
export let isBencodablePrimitive = (obj: any): obj is BencodablePrimitive => {
  switch (typeof obj) {
    case 'boolean':
    case 'number':
    case 'string':
      return true;
    
    default:
      return false;
  }
};