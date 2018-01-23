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

/**
 * Basic info dictionary in a .torrent file. 
 */
interface BaseInfoDictType {
  pieces: string;
  'piece length': number;
  'private'?: number;
}

/**
 * Info dictionary for single-file torrents.
 * @extends BaseInfoDictType Base extension.
 */
interface SingleFileInfoDictType extends BaseInfoDictType {
  name: string;
  length: number;
  md5sum?: string;
}

/**
 * Info dictionary for multi-file torrents.
 * @extends BaseInfoDictType Base extension.
 */
interface MultiFileInfoDictType extends BaseInfoDictType {
  name: string;
  files: {
    name: string;
    path: string[];
    md5sum?: string;
  };
}

/**
 * Represents the metainfo file structure of a .torrent file.
 */
export interface MetainfoType {
  announce: string;
  comment?: string;

  info: {
    pieces: string;
    'piece length': number;
    'private'?: number;
  };

  'announce-list'?: string[][];
  'creation date'?: number;
  'created by'?: string;
  'encoding'?: string;
}