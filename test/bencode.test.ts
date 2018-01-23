import { Observable } from 'rxjs';
import { Numbers, Objects, Strings } from 'javascriptutilities';
import { Bencode } from './../src';

let encoding = 'utf-8';
let timeout = 10;

describe('Individual bencoding mechanisms should work correctly', () => {
  let times = 1000;

  it('Bencoding strings - should work correctly', done => {
    /// Setup
    Observable.from(Numbers.range(0, times))
      .map(() => Numbers.randomBetween(1, 1000))
      .map(v => Strings.randomString(v).split(''))
      .map(v => v.filter(v1 => v1 !== Bencode.Tokens.delimiter))
      .map(v => v.join(''))
      .doOnNext(v => {
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
      })
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);

  it('Bencoding integers - should work correctly', done => {
    /// Setup
    Observable.from(Numbers.range(0, times))
      .map(() => Numbers.randomBetween(0, 100000))
      .doOnNext(v => {
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
      })
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);

  it('Bencoding array - should work correctly', done => {
    /// Setup
    Observable.from(Numbers.range(0, times))
      .map(() => {
        let stringLength = Numbers.randomBetween(0, 100);
        let string = Strings.randomString(stringLength);
        let integer = Numbers.randomBetween(0, 1000);
        let array1 = [string, integer];
        let array2 = [string, integer, array1];
        let dict1 = { 'key1': array2, 'key2': integer, 'key3': string };
        let dict2 = { 'key4': dict1, 'key5': array1 };

        let dict3 = Object.assign({}, dict2, {
          'key6': [Objects.entries(dict1), Objects.entries(dict2)],
          'key7': array1.map(v1 => '' + v1),
          'key8': Objects.entries<any>(array2.map<any>(v1 => v1)),
        });

        return [dict1, string, integer, array2, dict2, dict3];
      })
      .doOnNext(v => {
        /// When
        let encoded = Bencode.Encoder.encode(v, encoding).getOrThrow();
        let bytes = Bencode.Decoder.toByteString(encoded, encoding);
        let decoded = Bencode.Decoder.decodeList(bytes, 0).getOrThrow();
        let value = decoded[0];
        let offsetLength = decoded[1];

        /// Then
        expect(value).toEqual(v);
        expect(offsetLength).toBe(encoded.toString(encoding).length);
      })
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);

  it('Bencoding dictionary - should work correctly', done => {
    /// Setup
    Observable.from(Numbers.range(0, times))
      .map(() => ({ 'key1': 1, 'key2': '123' }))
      .map(v => {
        let stringLength = Numbers.randomBetween(1, 100);
        let string = Strings.randomString(stringLength);
        let integer = Numbers.randomBetween(0, 10000);
        let array = [string, integer];
        let object1 = Object.assign({}, v, { '1': string, '2': integer, '3': array });
        let object2 = Object.assign({}, object1, { '4': object1, '5': array });

        let object3 = Object.assign({}, object2, {
          '6': [object1, object2],
          '7': [array, array.map(v1 => '' + v1)],
          '8': Objects.entries(object2),
          '9': [Objects.entries(object1), Objects.entries(object2)],
        });

        return object3;
      })
      .doOnNext(v => {
        /// When
        let encoded = Bencode.Encoder.encode(v, encoding).getOrThrow();
        let bytes = Bencode.Decoder.toByteString(encoded, encoding);
        let decoded = Bencode.Decoder.decodeDictionary(bytes, 0).getOrThrow();
        let value = decoded[0];
        let offsetLength = decoded[1]; 

        /// Then
        expect(value).toEqual(v);
        expect(offsetLength).toBe(encoded.toString(encoding).length);
      })
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);
});