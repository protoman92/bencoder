import { Observable } from 'rxjs';
import * as fs from 'fs';
import { Collections, JSObject, Nullable, Numbers, Try } from 'javascriptutilities';
import * as Tokens from './tokens';
import { Bencodable, Encoding } from './types';

/// Use this to represent the return types for composing decode functions.
type OffsetT<T> = Try<[T, number]>;

/// Use this for 'decodeAny' to control whether to keep iterating.
type WhileFn = (lValue: Nullable<Bencodable>, lOff: number, cOff: number) => boolean;

/// Use this to represent fs' read options.
export type FSReadOption = { encoding?: string, flags?: string };

/**
 * Find the offset position of the next delimiter in order to calculate a
 * bencoded string's length.
 * @param {Buffer} buff A buffer instance.
 * @param {number} offset A number value.
 * @param {Encoding} e An Encoding instance.
 * @returns {Try<number>} A Try number instance.
 */
let findNextDelimiter = (buff: Buffer, offset: number, e: Encoding): Try<number> => {
  try {
    var newOffset = offset;
    let delimiter = Tokens.delimiter_buff(e)[0];

    while (buff[newOffset] !== delimiter) {
      Try.unwrap(buff[newOffset]).getOrThrow();
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
 * @param {Buffer} buff A Buffer instance..
 * @param {number} offset A number value.
 * @param {Encoding} e An Encoding instance.
 * @returns {OffsetT<number>} An OffsetT instance.
 */
let decodeStringLength = (buff: Buffer, offset: number, e: Encoding): OffsetT<number> => {
  return findNextDelimiter(buff, offset, e)
    .map((v): [number, number] => {
      return [Number.parseInt(buff.toString(e, offset, v)), v];
    });
};

/**
 * Decode the content of a string, after decoding its length, and return it
 * along with the new offset position.
 * @param {Buffer} buff A Buffer instance.
 * @param {number} offset A number value.
 * @param {number} length The string's decoded length.
 * @param {Encoding} e An Encoding instance.
 * @returns {OffsetT<string>} An OffsetT instance.
 */
let decodeStringContent = (buff: Buffer, offset: number, length: number, e: Encoding): OffsetT<string> => {
  let delimiter = Tokens.delimiter_buff(e)[0];

  return Try.success(buff).map(v => v[offset])
    .filter(v => v === delimiter, v => `Incorrect delimiter: ${v}`)
    .map((): [string, number] => {
      let sOffset = offset + 1;
      let eOffset = sOffset + length;
      let portion = buff.toString(e, sOffset, eOffset);
      return [portion, eOffset];
    });
};

/**
 * Decode a bencoded string and return it along with the new offset position.
 * @param {Buffer} buff A Buffer instance.
 * @param {number} offset A number value.
 * @param {Encoding} e An Encoding instance.
 * @returns {OffsetT<string>} An OffsetT instance.
 */
export let decodeString = (buff: Buffer, offset: number, e: Encoding): OffsetT<string> => {
  return decodeStringLength(buff, offset, e).flatMap(v => {
    return decodeStringContent(buff, v[1], v[0], e);
  });
};

/**
 * Decode a bencoded integer and return it along with the new offset position.
 * @param {Buffer} buff A Buffer instance.
 * @param {number} offset A number value.
 * @param {Encoding} e An Encoding instance.
 * @returns {OffsetT<number>} An OffsetT instance.
 */
export let decodeInteger = (buff: Buffer, offset: number, e: Encoding): OffsetT<number> => {
  let int_start = Tokens.int_start_buff(e)[0];
  let type_end = Tokens.type_end_buff(e)[0];

  return Try.success(buff).map(v => v[offset])
    .filter(v => v === int_start, v => `Incorrect token: ${v}`)
    .map((): [number, number] => {
      var sOffset = offset + 1;
      var cOffset = sOffset;
      
      while (buff[cOffset] !== type_end) {
        Try.unwrap(buff[sOffset]).getOrThrow();
        cOffset += 1;
      }

      let integer = Try.success(buff.toString(e, sOffset, cOffset))
        .map(v => Number.parseInt(v))
        .filter(v => !isNaN(v), v => `Not an integer: ${v}`)
        .filter(v => v >= 0, v => `${v} is negative`)
        .getOrThrow();

      return [integer, cOffset + 1];
    });
};

/**
 * Decode a bencoded list and return it along with the new offset position.
 * @param {Buffer} buff A Buffer instance.
 * @param {number} offset A number value.
 * @param {Encoding} e An Encoding instance.
 * @returns {OffsetT<Bencodable[]>} An OffsetT instance.
 */
export let decodeList = (buff: Buffer, offset: number, e: Encoding): OffsetT<Bencodable[]> => {
  let list_start = Tokens.list_start_buff(e)[0];
  let type_end = Tokens.type_end_buff(e)[0];

  return Try.success(buff).map(v => v[offset])
    .filter(v => v === list_start, v => `Invalid list token: ${v}`)
    .flatMap(() => decodeAny(buff, offset + 1, e, (_v1, _v2, v3) => {
      return buff[v3] !== type_end;
    }))
    .map((v): [Bencodable[], number] => [v[0], v[1] + 1]);
};

/**
 * Decode a bencoded dictionary and return it along with the new offset position.
 * @param {Buffer} buff A Buffer instance.
 * @param {number} offset A number value.
 * @param {Encoding} e An Encoding instance.
 * @returns {OffsetT<JSObject<Bencodable>>} An OffsetT instance.
 */
export let decodeDict = (buff: Buffer, offset: number, e: Encoding): OffsetT<JSObject<Bencodable>> => {
  let dict_start = Tokens.dict_start_buff(e)[0];
  let type_end = Tokens.type_end_buff(e)[0];

  return Try.success(buff).map((v): any => v[offset])
    .filter(v => v === dict_start, v => `Invalid dict token: ${v}`)
    .map((): [JSObject<Bencodable>, number] => {
      let sOffset = offset + 1;
      var cOffset = sOffset;
      var dict: JSObject<Bencodable> = {};

      while (buff[cOffset] !== type_end) {
        let decodedKey = decodeString(buff, cOffset, e).getOrThrow();
        cOffset = decodedKey[1];

        let decodedValue = decodeAny(buff, cOffset, e, (_v1, v2, v3) => {
          /// These two values are equal only in the first iteration.
          return v2 === v3;
        }).getOrThrow();
        
        let key = decodedKey[0];
        let value = Collections.first(decodedValue[0]).getOrThrow();
        cOffset = decodedValue[1];
        dict[key] = value;
      }

      return [dict, cOffset + 1];
    });
};

/**
 * Decode any type that is bencodable and return it along with the new offset
 * position.
 * @param {Buffer} buff A Buffer instance.
 * @param {number} offset A number value.
 * @param {Encoding} e An Encoding instance.
 * @param {WhileFn} whileFn While condition selector.
 * @returns {OffsetT<Bencodable[]>} An OffsetT instance.
 */
let decodeAny = (buff: Buffer, offset: number, e: Encoding, whileFn: WhileFn): OffsetT<Bencodable[]> => {
  var lastDecoded: Nullable<Bencodable>;
  var oOffset = offset;
  var nOffset = offset;
  let dict_start_buff = Tokens.dict_start_buff(e)[0];
  let int_start_buff = Tokens.int_start_buff(e)[0];
  let list_start_buff = Tokens.list_start_buff(e)[0];

  try {
    var bencodables: Bencodable[] = [];

    while (whileFn(lastDecoded, oOffset, nOffset)) {
      let type = Try.unwrap(buff[nOffset]).getOrThrow();
      oOffset = nOffset;
      
      switch (type) {
        case dict_start_buff:
          let dDecoded = decodeDict(buff, nOffset, e).getOrThrow();
          lastDecoded = dDecoded[0];
          nOffset = dDecoded[1];
          bencodables.push(dDecoded[0]);
          break;

        case list_start_buff:
          let lDecoded = decodeList(buff, nOffset, e).getOrThrow();
          lastDecoded = lDecoded[0];
          nOffset = lDecoded[1];
          bencodables.push(lDecoded[0]);
          break;

        case int_start_buff:
          let iDecoded = decodeInteger(buff, nOffset, e).getOrThrow();
          lastDecoded = iDecoded[0];
          nOffset = iDecoded[1];
          bencodables.push(iDecoded[0]);
          break;

        default:
          let sDecoded = decodeString(buff, nOffset, e).getOrThrow();
          lastDecoded = sDecoded[0];
          nOffset = sDecoded[1];
          bencodables.push(sDecoded[0]);
          break;
      }
    }

    return Try.success<[Bencodable[], number]>([bencodables, nOffset]);
  } catch (e) {
    return Try.failure(e);
  }
};

/**
 * Decode a buffer.
 * @param {Buffer} buff A Buffer instance.
 * @param {number} offset A number value.
 * @returns {OffsetT<Bencodable[]>} An OffsetT instance.
 */
let decodeBuffer = (buff: Buffer, offset: number, e: Encoding): OffsetT<Bencodable[]> => {
  return decodeAny(buff, offset, e, (_v1, _v2, v3) => buff[v3] !== undefined);
};

/**
 * Decode a bencoded piece of data.
 * @param {Buffer} buffer A Buffer instance.
 * @param {Encoding} e An Encoding instance.
 * @returns {Try<Bencodable>} A Try Bencodable instance.
 */
export let decode = (buffer: Buffer, e: Encoding): Try<Bencodable[]> => {
  return Try.success(buffer)
    .filter(v => v.length >= 0, `Data ${buffer} is empty`)
    .flatMap(v => decodeBuffer(v, 0, e))
    .map(v => v[0]);
};

/**
 * Decode a local .torrent file. Beware the the path is relative to the root
 * path of the directory.
 * @param {string} path The path to the file.
 * @param {Encoding} e An Encoding instance.
 * @returns {Observable<Try<Bencodable>>} An Observable instance.
 */
export let decodeLocalFile = (path: string, e: Encoding): Observable<Try<Bencodable>> => {
  type Callback = (err: NodeJS.ErrnoException, data: string | Buffer) => void;
  let bound = (p: string, o: FSReadOption, c: Callback): void => fs.readFile(p, o, c);
  
  return Observable
    .bindNodeCallback(bound)(path, {})
    .map(v => {
      if (typeof v === 'string') {
        return Buffer.from(v, e);
      } else {
        return v;
      }
    })
    .map(v => decode(v, e))
    .map(v => v.flatMap(v1 => Collections.first(v1)));
};