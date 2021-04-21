/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  DifferenceCache

  Works on simple collections: pure objects, maps, and arrays.
  Requires a unique key in objects that is provided at construct time.

  Main Operations
  - diff(collection) sets changeList
  - getChanges() returns changeLists { added, updated, removed }
  - getValues() returns the current elements in the cache

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

const DBG = require('./ur-dbg-settings');

/// TYPESCRIPT CJS HACK ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {}; // stops VSC from seeing "duplicate functions" across CJS modules

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const log = console.log;
const TEST = false;

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** print an array of objects keyProp values */
function dump_set(input, idKey = 'id') {
  let result;
  if (Array.isArray(input)) {
    if (input.length === 0) result = '[ ]';
    const stop = input.length - 1;
    const str = input.reduce((acc, o, idx) => {
      let s = `${acc} ${o[idKey]}`;
      if (idx !== stop) s += ',';
      return s;
    }, '');
    result = `[${str} ]`;
  }
  if (input.constructor.name === 'Object') {
    const vals = Object.values(input);
    if (vals.length === 0) result = '[ ]';
    const stop = vals.length - 1;
    const str = vals.reduce((acc, o, idx) => {
      let s = `${acc} ${o[idKey]}`;
      if (idx !== stop) s += ',';
      return s;
    }, '');
    result = `[${str} ]`;
  }
  return result;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** simple comparison of two arrays of objects with obj[keyProp] values */
function cmp_arr(ar1, ar2, idKey = 'id') {
  if (!(Array.isArray(ar1) && Array.isArray(ar2))) return false;
  if (ar1.length !== ar2.length) return false;
  const ids2 = ar2.map(obj => obj[idKey]);
  for (let i = 0; i < ar1.length; i++) {
    const id = ar1[i][idKey];
    if (!ids2.includes(id)) return false;
  }
  return true;
}

/// DIFFER CLASS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** The DifferenceCache ingests collections of data objects and keeps track
 *  of what changed since the last ingest.
 */
class DifferenceCache {
  collection: any; // pure object, map, or array
  cLastMap: Map<string, any>;
  cBufferMap: Map<string, any>;
  keyProp: string;
  changeLists: { added: any[]; updated: any[]; removed: any[] };
  staleMax: number;
  ageTable: any;

  constructor(key: string) {
    this.collection = []; // holds the collection being ingested
    this.cLastMap = new Map(); // the mapped version of the collection
    this.cBufferMap = new Map(); // used to buffer multiple cFrames into one map
    this.keyProp = key || 'id'; // property to use as difference key
    this.changeLists = {
      added: [],
      updated: [],
      removed: []
    };
    this.staleMax = 1; // maximum "age" for when the buffer is empty
  }

  /// IMMEDIATE MODE //////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** API: Clear the DifferenceCache */
  clear() {
    const size = this.cLastMap.size;
    this.cLastMap.clear();
    return size;
  }
  /** API: Calculate difference between this collection and the last.
   *  Returns { added, updated, removed } arrays by default. This
   */
  diff(collection, opt = { added: true, updated: true, removed: true }) {
    if (collection === undefined) {
      console.warn('DifferenceCache.update arg1 must be collection');
      return undefined;
    }
    let arr;
    this.collection = collection;
    if (Array.isArray(collection)) arr = collection;
    else if (collection instanceof Map) arr = [...collection.values()];
    else if (typeof collection === 'object') arr = Object.values(collection);

    if (Array.isArray(arr)) return this.diffArray(arr);
    console.error(
      'DifferenceCache.ingest non-mappable input',
      collection.constructor.name
    );
    return undefined;
  }
  /** ingest an array of objects with 'keyProp' used as unique key:
   *  [ { id:123 }, { id:1224 } ]
   */
  diffArray(arr: any[]) {
    const idKey = this.keyProp;
    const sobjs = this.cLastMap; // the last mapped collection
    const nobjs = new Map(); // ingested mapped collection
    const updated = [];
    const added = [];
    // (STEP 1) Of incoming collection, objects that are already in the cLastMap are
    // added to update list, or added list. Each processed object is set in the
    // "new" nobjs to mark it as seen.
    arr.forEach(obj => {
      const id = obj[idKey];
      if (id === undefined) console.error(`no comparison key '${idKey}' in`, obj);
      if (sobjs.has(id)) updated.push(obj);
      else added.push(obj);
      nobjs.set(id, obj);
    });
    // (STEP 2) To calculate what's missing, delete all the objects that were seen before
    // from the last mapped collection (cLastMap aka sobjs). The remaining objects in sobjs
    // that were not deleted are the elements that weren't seen this time, meaning they
    // have disappeared and thus are the "removed objects"
    arr.forEach(obj => {
      const id = obj[idKey];
      if (sobjs.has(id)) sobjs.delete(id);
    });
    const removed = [...sobjs.values()];
    // (STEP 3) The nobjs is the mapped array, and represents everything that's in the
    // current set. This becomes the new "last saved collection" for the next run
    this.cLastMap = nobjs;
    // (STEP 4) update the change lists; diff() implicitly does the differencing operation
    this.changeLists = { added, updated, removed };
    // doesn't return anything, use either getChanges() or getValues() to retrieve them
  }

  /// BUFFERED MODE ///////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** API: Clear the Buffer */
  clearBuffer(objs?: any[]) {
    if (!Array.isArray(objs)) {
      if (DBG.cframe) console.log('clearing entire buffer');
      this.cBufferMap.clear();
      return;
    }
    const objText = JSON.stringify(objs.map(o => o.id));
    console.warn('selectively clear buffer (unimplemented)', objText);
  }
  /** API: Collect input data into a buffer map that for later
   */
  buffer(collection) {
    if (collection === undefined) {
      console.warn('DifferenceCache.update arg1 must be collection');
      return undefined;
    }
    const idKey = this.keyProp;
    let arr;
    this.collection = collection;
    if (Array.isArray(collection)) arr = collection;
    else if (collection instanceof Map) arr = [...collection.values()];
    else if (typeof collection === 'object') arr = Object.values(collection);
    // blind write object into buffer
    arr.forEach(obj => {
      const id = obj[idKey];
      this.cBufferMap.set(id, obj);
    });
  }
  /** API: perform difference operation from the cBufferMap through diffArray.
   *  If passed a collection, it's buffered before the diffArray is called
   *  with the contents of the cBufferMap
   */
  diffBuffer(collection) {
    if (collection !== undefined) this.buffer(collection);
    const fullBuffer = this.cBufferMap.size > 0;
    if (fullBuffer) {
      this.diff(this.cBufferMap);
      this.cLastMap.forEach(obj => (obj.age = 0));
      this.clearBuffer();
    } else {
      // cLastMap is a map of id => cobj
      this.cLastMap.forEach(obj => {
        const { id } = obj;
        if (++obj.age > this.staleMax) {
          this.cLastMap.delete(id);
          if (DBG.cframe) console.log('deleting', id, obj);
        }
      });
    }
  }

  /// ACCESSORS ///////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** API: "staleness" is the max value of the object age counter. It is
   *  incremented if an entity has disappeared (step 2 of diffArray), and
   *  reset to 0 if freshly added/updated. Default is no staleness check
   */
  setStalenessThreshold(age = 1) {
    this.staleMax = age;
  }
  /** API: Retrieve last changes of for ingest, returning an object with
   *  added, updated, removed array properties. The changes are updated
   *  every time diff() is called.
   */
  getChanges() {
    return this.changeLists;
  }
  /** API: Retrieve the current list of objects
   */
  getValues() {
    return [...this.cLastMap.values()];
  }

  /** API: Retrieve the current list of objects in the buffer
   */
  getBufferValues() {
    return [...this.cBufferMap.values()];
  }
  /** API: return TRUE if passed id is in the map, meaning it's currently
   *  an active object.
   */
  hasKey(id) {
    return this.cLastMap.has(id);
  }
  /** API: Execute function of form ( value[,index,[array]])=>{},
   *  which is passed to Array.forEach()
   */
  forEach(func) {
    this.getValues().forEach(func);
  }
} // end class

/// TESTERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
if (TEST) {
  const testDiffer = new DifferenceCache('id');
  const tests = {
    'array comparison': {
      a: [{ id: 1 }, { id: 2 }, { id: 3 }],
      b: [{ id: 2 }, { id: 4 }],
      resAdd: [{ id: 4 }],
      resUpd: [{ id: 2 }],
      resRem: [{ id: 1 }, { id: 3 }]
    },
    'obj comparison': {
      a: { uaddr01: { id: 1 }, uaddr02: { id: 2 }, uaddr03: { id: 3 } },
      b: { uaddr01: { id: 2 }, uaddr02: { id: 4 } },
      resAdd: [{ id: 4 }],
      resUpd: [{ id: 2 }],
      resRem: [{ id: 1 }, { id: 3 }]
    }
  };
  Object.keys(tests).forEach(testName => {
    console.groupCollapsed('testing', testName);
    const { a, b, resAdd, resUpd, resRem } = tests[testName];
    log('set a:', dump_set(a));
    log('set b:', dump_set(b));
    // set initial
    testDiffer.diff(a);
    // get difference
    testDiffer.diff(b);
    const { added, updated, removed } = testDiffer.getChanges();
    if (!cmp_arr(added, resAdd))
      log('*FAIL* added !== expected result', added, resAdd);
    else if (!cmp_arr(updated, resUpd))
      log('*FAIL* updated !== expected result', updated, resUpd);
    else if (!cmp_arr(removed, resRem))
      log('*FAIL* removed !== expected result', removed, resRem);
    else log('PASSED: B diff A');
    console.groupEnd();
  });
} // end tester

/// MODULE EXPORTS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = DifferenceCache;
