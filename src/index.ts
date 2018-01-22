import * as encoder from './encode';
import * as decoder from './decode';
import { Bencodable, BencodablePrimitive } from './types';
import * as tokens from './tokens';
import * as types from './types';

export namespace Bencode {
  export let Decoder = decoder;
  export let Encoder = encoder;
  export let Tokens = tokens;
  export let Types = types;
}

export { Bencodable, BencodablePrimitive };