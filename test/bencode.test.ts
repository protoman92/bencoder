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

  it('Bencoding array - should work correctly', () => {
    /// Setup
    Numbers.range(0, 100)
      .map(() => {
        let stringLength = Numbers.randomBetween(0, 100);
        let string = Strings.randomString(stringLength);
        let integer = Numbers.randomBetween(0, 1000);
        return [string, integer];
      })
      .forEach(v => {
        /// When
        let encoded = Bencode.Encoder.encode(v, encoding).getOrThrow();
        let bytes = Bencode.Decoder.toByteString(encoded, encoding);
        let decoded = Bencode.Decoder.decodeList(bytes, 0).getOrThrow();
        let value = decoded[0];
        let offsetLength = decoded[1];

        /// Then
        expect(value).toEqual(v);
        expect(offsetLength).toBe(encoded.toString(encoding).length);
      });
  });
});