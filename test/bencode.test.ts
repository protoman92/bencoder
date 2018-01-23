import { Observable } from 'rxjs';
import { Collections, Numbers, Objects, Strings } from 'javascriptutilities';
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
        let decoded = Bencode.Decoder.decodeString(encoded, 0, encoding).getOrThrow();
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
        let decoded = Bencode.Decoder.decodeInteger(encoded, 0, encoding).getOrThrow();
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
        let decoded = Bencode.Decoder.decodeList(encoded, 0, encoding).getOrThrow();
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
        let decoded = Bencode.Decoder.decodeDict(encoded, 0, encoding).getOrThrow();
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

describe('Decoding torrent files should work correctly', () => {
  it('Decoding test torrent file should work correctly', done => {
    /// Setup
    let paths = [
      'aia-terrain-test.torrent',
      'arma2-test.torrent',
      'blackmesa-test.torrent',
      'crysis-demo-test.torrent',
      'hubblecast-test.torrent',
      'linux-test.torrent',
      'stalker-test.torrent',
      'test.torrent',
    ];

    Observable.from(paths).map(v => './test/' + v)
      .flatMap(v => Observable.zip(
        Bencode.Decoder.readLocalFile(v, encoding),
        Bencode.Decoder.decodeLocalFile(v, encoding),
        (v1, v2) => {
          /// Then
          let buffer = v1.getOrThrow();
          let decoded = v2.getOrThrow();
          let reEncoded = Bencode.Encoder.encode(decoded, encoding).getOrThrow();
          let bufferStr = buffer.toString(encoding).split('');
          let reEncodedStr = reEncoded.toString(encoding).split('');
          expect(decoded.announce).toBeTruthy();
          expect(decoded.info).toBeTruthy();
          Collections.zip(bufferStr, reEncodedStr, (v1, v2) => expect(v1).toBe(v2));
        }
      ))
      .doOnError(e => fail(e))
      .doOnCompleted(() => done())
      .subscribe();
  });
});