import { Numbers, Strings } from 'javascriptutilities';
import { Bencode } from './../src';

let encoding = 'utf-8';

describe('Individual bencoding mechanisms should work correctly', () => {
  let times = 1000;

  it('Bencoding strings - should work correctly', () => {
    /// Setup
    Numbers.range(0, times)
      .map(() => Numbers.randomBetween(1, 1000))
      .map(v => Strings.randomString(v).split(''))
      .map(v => v.filter(v1 => v1 !== Bencode.Tokens.delimiter))
      .map(v => v.join(''))
      .forEach(v => {
        /// When
        let encoded = Bencode.Encoder.encode(v, encoding).getOrThrow();
        let bytes = Bencode.Decoder.toByteString(encoded, encoding);
        let decoded = Bencode.Decoder.decodeString(bytes, 0).getOrThrow();
        let value = decoded[0];
        let length = ('' + value.length).length;
        let offsetLength = decoded[1];

        /// Then
        expect(value).toBe(v);
        expect(offsetLength).toBe(v.length + length + 1);
        expect(offsetLength).toBe(encoded.toString(encoding).length);
      });
  });

  it('Bencoding integers - should work correctly', () => {
    /// Setup
    Numbers.range(0, times)
      .map(() => Numbers.randomBetween(0, 100000))
      .forEach(v => {
        /// When
        let encoded = Bencode.Encoder.encode(v, encoding).getOrThrow();
        let bytes = Bencode.Decoder.toByteString(encoded, encoding);
        let decoded = Bencode.Decoder.decodeInteger(bytes, 0).getOrThrow();
        let value = decoded[0];
        let offsetLength = decoded[1];

        /// Then
        expect(value).toBe(v);
        expect(offsetLength).toBe(('' + value).length + 2);
        expect(offsetLength).toBe(encoded.toString(encoding).length);
      });
  });

  // it('Bencoding array - should work correctly', () => {
  //   /// Setup
  //   Numbers.range(0, times)
  //     .map(() => {
  //       let stringLength = Numbers.randomBetween(0, 100);
  //       let string = Strings.randomString(stringLength);
  //       let integer = Numbers.randomBetween(0, 1000);
  //       let array1 = [string, integer];
  //       let array2 = [string, integer, array1];
  //       let dict1 = { 'key1': array2, 'key2': integer, 'key3': string };
  //       return [dict1, string, integer, array2];
  //     })
  //     .forEach(v => {
  //       /// When
  //       let encoded = Bencode.Encoder.encode(v, encoding).getOrThrow();
  //       let bytes = Bencode.Decoder.toByteString(encoded, encoding);
  //       let decoded = Bencode.Decoder.decodeList(bytes, 0).getOrThrow();
  //       let value = decoded[0];
  //       let offsetLength = decoded[1];

  //       /// Then
  //       expect(value).toEqual(v);
  //       expect(offsetLength).toBe(encoded.toString(encoding).length);
  //     });
  // });

  it.only('Bencoding dictionary - should work correctly', () => {
    /// Setup
    Numbers.range(0, 1)
      .map(() => ({ 'key1': 1, 'key2': '123' }))
      .map(v => {
        let stringLength = Numbers.randomBetween(1, 2);
        let string = Strings.randomString(stringLength);
        let integer = Numbers.randomBetween(0, 2);
        let array = [string, integer];
        return Object.assign({}, v, { '1': string, '2': integer, '3': array });
      })
      .forEach(v => {
        console.log(v);
        /// When
        let encoded = Bencode.Encoder.encode(v, encoding).getOrThrow();
        console.log(encoded.toString());
        let bytes = Bencode.Decoder.toByteString(encoded, encoding);
        let decoded = Bencode.Decoder.decodeDictionary(bytes, 0).getOrThrow();
        let value = decoded[0];
        let offsetLength = decoded[1];
        console.log(value);

        /// Then
        expect(value).toEqual(v);
        expect(offsetLength).toBe(encoded.toString(encoding).length);
      });
  });
});