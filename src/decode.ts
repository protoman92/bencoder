import { Collections, JSObject, Nullable, Numbers, Try } from 'javascriptutilities';
import * as Tokens from './tokens';
import { Bencodable, Encoding } from './types';

/// Use this to represent the return types for composing decode functions.
type OffsetT<T> = Try<[T, number]>;

/// Use this for 'decodeAny' to control whether to keep iterating.
type WhileFn = (lValue: Nullable<Bencodable>, lOff: number, cOff: number) => boolean;

/**
 * Convert a buffer to a byte string Array.
 * @param {Buffer} buffer A Buffer instance.
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {string[]} A string Array instance.
 */
export let toByteString = (buffer: Buffer, encoding: Encoding): string[] => {
  return buffer.toString(encoding).split('');
};

/**
 * Decode a bencoded piece of data.
 * @param {Buffer} buffer A Buffer instance.
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Bencodable>} A Try Bencodable instance.
 */
export let decode = (buffer: Buffer, encoding: Encoding): Try<Bencodable> => {
  return Try.success(buffer)
    .filter(v => v.length >= 0, `Data ${buffer} is empty`)
    .map(v => v.toString(encoding).split(''))
    .map(v => decodeBytes(v, 0))
    .map(() => '');
};

/**
 * Find the offset position of the next delimiter in order to calculate a
 * bencoded string's length.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @returns {Try<number>} A Try number instance.
 */
let findNextDelimiterOffsetPosition = (bytes: string[], offset: number): Try<number> => {
  try {
    var newOffset = offset;

    while (bytes[newOffset] !== Tokens.delimiter) {
      Try.unwrap(bytes[newOffset]).getOrThrow();
      newOffset += 1;
    }

    return Try.unwrap(newOffset);
  } catch (e) {
    return Try.failure(e);
  }
};

/**
 * Decode the length of the string that is found at the current offset position,
 * as well as the new offset.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @returns {OffsetT<number>} An OffsetT instance.
 */
let decodeStringLength = (bytes: string[], offset: number): OffsetT<number> => {
  return findNextDelimiterOffsetPosition(bytes, offset).map((v): [number, number] => {
    return [Number.parseInt(bytes.slice(offset, v).join('')), v];
  });
};

/**
 * Decode the content of a string, after decoding its length, and return it
 * along with the new offset position.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @param {number} length The string's decoded length.
 * @returns {OffsetT<string>} An OffsetT instance.
 */
let decodeStringContent = (bytes: string[], offset: number, length: number): OffsetT<string> => {
  return Try.success(bytes)
    .flatMap(v => Collections.elementAtIndex(v, offset))
    .filter(v => v === Tokens.delimiter, v => `Incorrect delimiter: ${v}`)
    .flatMap(() => {
      let startOffset = offset + 1;
      let endOffset = startOffset + length;
      let initial: Try<string[]> = Try.success([]);

      return Numbers.range(startOffset, endOffset)
        .map(v => Collections.elementAtIndex(bytes, v))
        .reduce((v1, v2) => v1.zipWith(v2, (a, b) => a.concat([b])), initial)
        .map(v => v.join(''))
        .map((v): [string, number] => [v, offset + length + 1]);
    });
};

/**
 * Decode a bencoded string and return it along with the new offset position.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @returns {OffsetT<string>} An OffsetT instance.
 */
export let decodeString = (bytes: string[], offset: number): OffsetT<string> => {
  return decodeStringLength(bytes, offset).flatMap(v => {
    return decodeStringContent(bytes, v[1], v[0]);
  });
};

/**
 * Decode a bencoded integer and return it along with the new offset position.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @returns {OffsetT<number>} An OffsetT instance.
 */
export let decodeInteger = (bytes: string[], offset: number): OffsetT<number> => {
  return Try.success(bytes)
    .flatMap(v => Collections.elementAtIndex(v, offset))
    .filter(v => v === Tokens.int_start, v => `Incorrect token: ${v}`)
    .map((): [number, number] => {
      var startOffset = offset + 1;
      var currentOffset = startOffset;
      
      while (bytes[currentOffset] !== Tokens.type_end) {
        Try.unwrap(bytes[startOffset])
          .filter(v => !isNaN(Number.parseInt(v)), v => `Not an integer: ${v}`)
          .getOrThrow();

        currentOffset += 1;
      }

      let integer = Try.success(bytes.slice(startOffset, currentOffset))
        .map(v => v.join(''))
        .map(v => Number.parseInt(v))
        .filter(v => !isNaN(v), v => `Not an integer: ${v}`)
        .filter(v => v >= 0, v => `${v} is negative`)
        .getOrThrow();

      return [integer, currentOffset + 1];
    });
};

/**
 * Decode a bencoded list and return it along with the new offset position.
 * @param {string[]} bytes A byte string Array. 
 * @param {number} offset A number value.
 * @returns {OffsetT<Bencodable[]>} An OffsetT instance.
 */
export let decodeList = (bytes: string[], offset: number): OffsetT<Bencodable[]> => {
  return Try.success(bytes)
    .flatMap(v => Collections.elementAtIndex(v, offset))
    .filter(v => v === Tokens.list_start, v => `Invalid list token: ${v}`)
    .flatMap(() => decodeAny(bytes, offset + 1, (_v1, _v2, v3) => {
      return bytes[v3] !== Tokens.type_end;
    }))
    .map((v): [Bencodable[], number] => [v[0], v[1] + 1]);
};

/**
 * Decode a bencoded dictionary and return it along with the new offset position.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @returns {OffsetT<JSObject<Bencodable>>} An OffsetT instance.
 */
export let decodeDictionary = (bytes: string[], offset: number): OffsetT<JSObject<Bencodable>> => {
  return Try.success(bytes)
    .flatMap(v => Collections.elementAtIndex(v, offset))
    .filter(v => v === Tokens.dictionary_start, v => `Invalid dict token: ${v}`)
    .map((): [JSObject<Bencodable>, number] => {
      let startOffset = offset + 1;
      var currentOffset = startOffset;
      var dict: JSObject<Bencodable> = {};

      while (bytes[currentOffset] !== Tokens.type_end) {
        let decodedKey = decodeString(bytes, currentOffset).getOrThrow();
        currentOffset = decodedKey[1];
        
        let decodedValue = decodeAny(bytes, currentOffset, (_v1, v2, v3) => {
          /// These two values are equal only in the first iteration.
          return v2 === v3;
        }).getOrThrow();
        
        let key = decodedKey[0];
        let value = Collections.first(decodedValue[0]).getOrThrow();
        currentOffset = decodedValue[1];
        dict[key] = value;
      }

      return [dict, currentOffset + 1];
    });
};

/**
 * Decode any type that is bencodable and return it along with the new offset
 * position.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @param {WhileFn} whileFn While condition selector.
 * @returns {OffsetT<Bencodable[]>} An OffsetT instance.
 */
let decodeAny = (bytes: string[], offset: number, whileFn: WhileFn): OffsetT<Bencodable[]> => {
  var lastDecoded: Nullable<Bencodable>;
  var oldOffset = offset;
  var newOffset = offset;

  try {
    var bencodables: Bencodable[] = [];

    while (whileFn(lastDecoded, oldOffset, newOffset)) {
      let type = Collections.elementAtIndex(bytes, newOffset).getOrThrow();
      oldOffset = newOffset;
      
      switch (type) {
        case Tokens.dictionary_start:
          let dDecoded = decodeDictionary(bytes, newOffset).getOrThrow();
          lastDecoded = dDecoded[0];
          newOffset = dDecoded[1];
          bencodables.push(dDecoded[0]);
          break;

        case Tokens.list_start:
          let lDecoded = decodeList(bytes, newOffset).getOrThrow();
          lastDecoded = lDecoded[0];
          newOffset = lDecoded[1];
          bencodables.push(lDecoded[0]);
          break;

        case Tokens.int_start:
          let iDecoded = decodeInteger(bytes, newOffset).getOrThrow();
          lastDecoded = iDecoded[0];
          newOffset = iDecoded[1];
          bencodables.push(iDecoded[0]);
          break;

        default:
          let sDecoded = decodeString(bytes, newOffset).getOrThrow();
          lastDecoded = sDecoded[0];
          newOffset = sDecoded[1];
          bencodables.push(sDecoded[0]);
          break;
      }
    }

    return Try.success<[Bencodable[], number]>([bencodables, newOffset]);
  } catch (e) {
    return Try.failure(e);
  }
};

/**
 * Decode an Array of byte string, and return it along with the new offset
 * position.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @returns {OffsetT<Bencodable[]>} An OffsetT instance.
 */
let decodeBytes = (bytes: string[], offset: number): OffsetT<Bencodable[]> => {
  let totalCount = bytes.length;
  return decodeAny(bytes, offset, (_v1, _v2, v3) => v3 < totalCount);
};