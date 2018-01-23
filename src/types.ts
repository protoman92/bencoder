import { Indeterminate, JSObject, Types } from 'javascriptutilities';

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
export interface BaseInfoDictType {
  pieces: string;
  'piece length': number;
  'private'?: number;
}

/**
 * Info dictionary for single-file torrents.
 * @extends BaseInfoDictType Base extension.
 */
export interface SingleFileInfoDictType extends BaseInfoDictType {
  name: string;
  length: number;
  md5sum?: string;
}

/**
 * Info dictionary for multi-file torrents.
 * @extends BaseInfoDictType Base extension.
 */
export interface MultiFileInfoDictType extends BaseInfoDictType {
  name: string;
  files: {
    name: string;
    path: string[];
    md5sum?: string;
  };
}

/**
 * Represents the metainfo file structure of a .torrent file.
 * @extends {JSObject<Bencodable>} JSObject extension.
 */
export interface MetaInfoType extends JSObject<Bencodable> {
  announce: string;
  comment?: string;
  info: SingleFileInfoDictType | MultiFileInfoDictType;
  'announce-list'?: string[][];
  'creation date'?: number;
  'created by'?: string;
  'encoding'?: string;
}

/**
 * Check if an object is a metainfo dictionary.
 * @param {any} * Any object.
 * @returns {obj is MetaInfoType} A boolean value.
 */
export let isMetaInfo = (obj: any): obj is MetaInfoType => {
  let requiredKeys = ['announce', 'info'];
  let requiredInfoKeys = ['pieces', 'piece length'];

  return true 
    && Types.isInstance<MetaInfoType>(obj, ...requiredKeys)
    && Types.isInstance<BaseInfoDictType>(obj['info'], ...requiredInfoKeys)
    && requiredKeys.every(v => obj[v] !== undefined && obj[v] !== null);
};