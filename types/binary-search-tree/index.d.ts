// type delcaration for https://www.npmjs.com/package/binary-search-tree
declare module 'binary-search-tree' {
  export interface BSTOptions<K, T> {
    unique?: boolean,
    compareKeys?: (a: K, b: K) => number,
    checkValueEquality?: (a: T, b: T) => boolean
  }
  export class BinarySearchTree<K, T> {
    constructor (options?: BSTOptions<K, T>)
    insert (key: K, item: T): void
    search (key: K): T[]
    delete (key: K, item?: T): void
  }
}
