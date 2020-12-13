/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  This PTRACK INPUT MODULE handles a few things:

  1. Use a PTrack Endpoint to manage the stream of raw PTRACK entities
  2. Denoise raw PTRACK entities
  3. Maintain 'active' entities from frame-to-frame
  4. Align raw PTRACK entity coordinates into simulation coordinates
  5. Provide the current 'active' entities list to requesters

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import SyncMap from 'lib/class-syncmap';
import PTrack from './lib/class-ptrack-endpoint';
import { EntityObject } from './lib/t-ptrack';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PR = UR.PrefixUtil('IN-PTRACK', 'TagRed');
let DBGOUT = false;
let DBGEDGE = false;

/// MOCKED OBJECTS TO REPLACE
const XSETTINGS = {
  ptrackSRadius: 0.1,
  ptrackTimeout: 66,
  ptrackMinAge: 16
};
let MAX_NOP = 500;
let MIN_AGE = 350;
let MIN_NOP = MIN_AGE / 2;
let SRADIUS = 0.0001;

// piece management utilities
let m_inputs = []; // activity-wide tracker piece pool
let m_pieces = []; // valid tracker pieces

// master object for location transform properties
let m_transform = {};

// HTML element used for updating debug info
// defined in input-transform.html subview
let ui_ptrack_entities;

// input filtering parameters

// pool creation parameters
let m_pool_parm = null;

/// PTRACK CONNECTION OBJECT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PTM = new PTrack();
let VALID_ENTITIES;

/// SIMPLIFIED TRACKER INTERFACE ////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
VALID_ENTITIES = new SyncMap({
  Constructor: EntityObject,
  autoGrow: true,
  name: 'RawEntityValidator'
});
VALID_ENTITIES.setMapFunctions({
  onAdd: (raw, eo) => {
    eo.copy(raw);
  },
  onUpdate: (raw, eo) => {
    eo.x = raw.x;
    eo.y = raw.y;
  },
  shouldRemove: eo => {},
  onRemove: () => {}
});
export function UpdateInputs(ms) {
  const raw = PTM.GetRawEntities();
  const { added, updated, removed } = VALID_ENTITIES.syncFromArray(raw);
  VALID_ENTITIES.mapObjects();
  if (added.length > 0) console.log('added', added.length);
  if (updated.length > 0) console.log('updated', updated.length);
  if (removed.length > 0) console.log('removed', removed.length);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** MAIN ROUTINE for handling entity mapping to pieces
 *  m_inputs -  List of pieces that are assigned TrackerObjects
 *              by INPUT.MapEntities(). This is a pool of pieces used
 *              for TrackerObject mapping.
 *  m_pieces -  List of pieces that the player considers "active",
 *              constructed every frame by scanning the list of valid
 *              pieces in m_inputs. When writing player logic, you should
 *              be using m_pieces, not m_inputs
 */
export function UpdateTrackerPieces(ms, parm) {
  let lostFunc = parm.lostFunc; // used by MapEntities to clear
  let addedFunc = parm.addedFunc; // used by MapEntities to set

  // update the piece mapping by setting update
  let i;
  let p;
  let tobj;
  let unassigned = []; // trackerobjs needing pieces
  let reclaimed = []; // pieces lost trackerobjs

  // are there any "input pieces" that need tracking?
  if (m_inputs.length && m_inputs.length > 0) {
    // assign TrackerObjects to input pieces
    // save the list of unassigned TrackerObject ids for later
    unassigned = MapEntities(m_inputs, ms, addedFunc, lostFunc);

    // process all input pieces, grab their TrackerObject,
    // and tell them to LERP to its position
    // ALSO
    // if there is no valid TrackerObject, reclaim the
    // piece and mark it as available for reuse
    for (i = 0; i < m_inputs.length; i++) {
      p = m_inputs[i];
      /* OLD PLAE CODE
      if (p) {
        tobj = p.TrackerObject();
        if (tobj && tobj.IsValid()) {
          if (tobj.isNew) {
            p.SetPosition(tobj.Position());
            // if (DEBUG) console.log('new tracked object',tobj.id);
            tobj.isNew = false;
          } else {
            p.Track();
          }
        } else {
          p.Visual().Hide();
          reclaimed.push(p);
        }
      }
      */
    }

    // create new pieces for m_inputs pool as necessary
    // calculate how many are needed and make them
    let piecesToCreate = unassigned.length - reclaimed.length;

    if (piecesToCreate > 0) {
      piecesToCreate += m_inputs.length;
      m_pool_parm.count = piecesToCreate;
      InitializeTrackerPiecePool(m_pool_parm);
    }
  }

  // CREATE LIST OF VALID PIECES in m_pieces
  // first erase m_pieces reference safely...
  while (m_pieces.length > 0) {
    m_pieces.pop();
  }

  // ...then create filtered list of valid m_pieces
  for (i = 0; i < m_inputs.length; i++) {
    p = m_inputs[i];
    /** OLD PLAE CODE
    tobj = p.TrackerObject();
    if (tobj && tobj.IsInside()) {
      m_pieces.push(p);
      p.Visual().Show();
    } else {
      p.Visual().Hide();
    }
    */
  }

  // return the valid piece list
  return m_pieces;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Return the TrackerObject pool
 */
export function GetValidTrackerPieces() {
  return m_pieces;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Override the default mode and create seeker-style trackerpieces
 */
export function SetTrackerPiecesToSeekMode() {
  TrackerObject.ConstructorTrackMode(TrackerObject.MODE_SEEK);
  for (let i = 0; i < m_inputs.length; i++) {
    m_inputs[i].tracker_object.mode = TrackerObject.MODE_SEEK;
  }
}

/// TRACKER ENTITY FILTERING PARAMETERS ///////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function UpdateFilterSettings() {
  // 	needs update to use Settings
  MAX_NOP = XSETTINGS.ptrackTimeout;
  MIN_AGE = XSETTINGS.ptrackMinAge;
  SRADIUS = XSETTINGS.ptrackSRadius;
  MIN_NOP = MIN_AGE / 2;
  console.log('SET PTRACK FILTER VALUES', MAX_NOP, MIN_AGE, SRADIUS);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function SetFilterTimeout(nop) {
  if (nop === undefined) return;
  if (nop < MIN_AGE) {
    console.warn('Timeout', nop, "can't be less than Age Threshold", MIN_AGE);
    return;
  }
  MAX_NOP = nop;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function SetFilterAgeThreshold(age) {
  if (age === undefined) return;
  if (age > MAX_NOP) {
    console.warn('Age', age, "can't be greater than timeout", MAX_NOP);
    return;
  }
  MIN_AGE = age;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function SetFilterFreshnessThreshold(threshold) {
  if (threshold === undefined) return;
  if (threshold > MIN_AGE / 2) {
    console.log(
      'Threshold',
      threshold,
      'should be lower compared to AgeThreshold'
    );
  }
  MIN_NOP = threshold;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function SetFilterRadius(rad) {
  if (rad === undefined) return;
  if (Number.isNaN(rad)) {
    console.warn('SetFilterRadius expects a number, not', rad);
    return;
  }
  SRADIUS = rad;
}

/// INITIALIZATION ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** ptrackServer is where the forwarded UDP data from PTRACK is being
 *  served, usually on port 3030 (e.g. ws://localhost:3030)
 */
export function Connect(ptrackServer) {
  console.assert(ptrackServer, 'Must pass ServerAddress?');
  // Initialize PTRACK connection
  console.group(...PR('creating PTRACK endpoint'));
  PTM.Connect(ptrackServer);
  UpdateFilterSettings();
  console.groupEnd();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function GetRawEntities() {
  return PTM.GetRawEntities();
}

/// ENTITY HELPERS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Convert entity coordinates to gameworld gameworld coordinates.
 *  entity: { id, x, y, h, nop } - tracker coords
 *  trackerObject: { id, pos, valid } - game coords
 */
function m_TransformAndUpdate(entity, trackerObj) {
  // tracker space position
  let x = entity.x;
  let y = entity.y;
  let z = entity.h;

  console.log('entity', ...entity);
  /* OLD PLAE CODE

  // invert tracker axis?
  if (m_transform.invertX) x = -x;
  if (m_transform.invertY) y = -y;

  // create working vector to convert to game space

  let pos = new THREE.Vector3(x, y, z);

  // DEBUG - REMOVE LATER
  // if (!m_transform.matrix_align) return;

  if (entity.isFaketrack) {
    // skip transform if the tracker object is from faketrack
    // faketrack data should already be normalized
    // console.log('skipping transform');
  } else {
    // align coordinate axis and origin
    pos = pos.applyMatrix4(m_transform.matrix_align);
    // normalize
    pos.x /= m_transform.t_halfwidth;
    pos.y /= m_transform.t_halfdepth;
  }

  // check inside or not
  let outsideX = pos.x < -1 || pos.x > 1;
  let outsideY = pos.y < -1 || pos.y > 1;
  trackerObj.isOutside = outsideX || outsideY;

  // add age
  trackerObj.age = entity.age;

  // convert normalized to gameworld coordinates
  pos.x *= m_transform.g_halfwidth;
  pos.y *= m_transform.g_halfdepth;
  // pos.z = pos.z;

  // copy transform values
  trackerObj.pos.set(pos.x, pos.y, pos.z);

  // copy object and pose track info
  trackerObj.type = entity.type;
  trackerObj.name = entity.name;
  trackerObj.pose = entity.pose;
  */
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** entity is checked against other entities in idsActive
 *  it's assumed that idsActive does NOT contain entity
 */
function m_IsOldestInRadius(entity, idsActive, entityDict) {
  let rad2 = SRADIUS * SRADIUS;
  let result = true;
  idsActive.forEach(i => {
    let c = entityDict[idsActive[i]];
    let x2 = (c.x - entity.x) ** 2;
    let y2 = (c.y - entity.y) ** 2;
    // is point outside of circle? continue
    if (x2 + y2 >= rad2) return;
    // otherwise we're inside, so check who's older
    if (entity.age < c.age) {
      result = false;
      // merge position with baddies
      c.x = (c.x + entity.x) / 2;
      c.y = (c.y + entity.y) / 2;
    }
  });
  return result;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let m_places = 2;
/** Utility function to format a string to a padding length.
 *  Used by Tracker Utility
 */
function u_format(num, fixed = 2) {
  // HACK *****  to deal with string input
  // marco is always sending a string now to deal with a nan
  // data for some orientation and pose predictions
  num = parseFloat(num);

  let str = num.toFixed(fixed).toString();
  if (str.length > m_places) m_places = str.length;
  while (str.length < m_places) str = ` ${str}`;
  return str;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Utility function to clip a string to given length
 *  http://stackoverflow.com/questions/2686855/is-there-a-javascript-function-that-can-pad-a-string-to-get-to-a-determined-leng
 */
function u_pad(str, padLeft) {
  let pad = '            '; // 15 spaces
  if (padLeft) return (pad + str).slice(-pad.length);
  return (str + pad).substring(0, pad.length);
}

/// RAW ENTITY SERVICES //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** EntityDict() returns the PTrack Entity Dictionary
 */
export function PTrackEntityDict() {
  // dict: entityid -> { id,x,y,h,nop }
  let entityDict = PTM.GetEntityDict();
  return entityDict;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** KEY FUNCTION: Maps TrackerEntities to Pieces every frame in the form
 *  of a TrackerObject, which is similar to TrackerEntity but has gameworld
 *  coordinates instead. Algorithm:
 *    Maintain a list of "active entity ids" from which to allocate.
 *    Check list of pieces "tracker object", and get entity id.
 *    Update entity id if it's in the pool of active entity ids
 *    .. otherwise, add piece to list of "orphaned/lost pieces"
 *    .. remove updated id from the list of "active entity ids"
 *    If there are any active entity ids left, then:
 *    .. assign them to "orphaned/lost" pieces
 *    .. assign remainder to "new pieces" (didn't have a TrackerObject)
 */
export function MapEntities(pieceList, intervalMS, addedFunc, lostFunc) {
  // dict: entityid -> { id,x,y,h,nop }
  let entityDict = PTM.GetEntityDict();

  // init entity processing list with all entities
  let idsActive = Object.keys(entityDict);

  // reused loop variables
  let i;
  let id;
  let entity;
  let p;
  let tobj;
  let arrayCount;
  let found;

  /// AGING ///////////////////////////////////////////////////////////

  let maxNOP = MAX_NOP; // max "no operation" time in milliseconds
  let minAge = MIN_AGE; // minimum age to be considered "active"
  let minNOP = MIN_NOP; // threshold for detecting single-frame popups

  let ui_out = '';
  ui_out += "<div style='font-family:monospace;white-space:pre'>";

  arrayCount = idsActive.length;
  if (arrayCount < 1) {
    ui_out += 'No PTRACK entities detected';
  }
  for (i = 0; i < arrayCount; i++) {
    id = idsActive.shift();
    entity = entityDict[id];

    // delete any entity that is too old
    if (entity.nop > maxNOP) {
      delete entityDict[id];
      continue;
    }

    // check for case of an active, appropriately aged entity
    // a solid trace will have a low nop, whereas a momentary
    // one will have not updated in a while, up to the value of
    // maxNOP
    if (entity.age > minAge) {
      // old, but not updated in a while
      if (entity.nop > maxNOP) {
        delete entityDict[id];
        continue;
      }

      // If entities appeared for just a few frames,
      // we want to remove them more quickly than maxNOP
      // To detect them, age-nop > a threshold
      if (entity.age - entity.nop < minNOP) {
        if (DBGOUT) console.log(`suppress\t${id}`, 'noise');
        delete entityDict[id];
        continue;
      }

      const age_override = true;
      // check for suppression due to overlap for young pieces
      if (entity.age < maxNOP || age_override) {
        if (!m_IsOldestInRadius(entity, idsActive, entityDict)) {
          if (DBGOUT) console.log(`suppress\t${id}`, 'overlap');
          delete entityDict[id];
          continue;
        }
      }

      // otherwise, go ahead and add the id
      idsActive.push(id);
    }

    // update counters
    entity.nop += intervalMS;
    entity.age += intervalMS;

    // update ui
    entity.name = entity.name || '';
    ui_out += `${u_pad(id + entity.name) + u_format(entity.x)}, ${u_format(
      entity.y
    )}\t${entity.nop}\n`;
  }
  // isdActive is now purged of stale entities
  // entityMap is now purged of stale entities

  // finish UI stuff
  ui_out += '</div>';
  // output if #ui-ptrack-entities was found in Initialize()
  if (ui_ptrack_entities) ui_ptrack_entities.html(ui_out);

  /// UPDATING ////////////////////////////////////////////////////////
  /**
   *  UPDATE THE PIECES
   *  if there is a trackerobject,
   *  .. get its id and look it up in entityDict
   *  .. copy values with transform
   *  .. remove id from idsActive (use for later assignment)
   *  !! if id invalid, save piece and zero trackerobject
   */
  let piecesLost = [];
  let piecesNew = [];
  // update pieces
  for (i = 0; i < pieceList.length; i++) {
    /* DISABLE
    p = pieceList[i];
    tobj = { ...p }; // was p.TrackerObject();
    if (tobj) {
      entity = entityDict[tobj.id];
      if (entity) {
        found = idsActive.indexOf(tobj.id);
        if (found < 0) {
          console.log('unexpected error:', tobj.id, 'was not found');
        } else {
          m_TransformAndUpdate(entity, tobj);
          idsActive.splice(found, 1);
        }
      } else {
        p.SetTrackerObject(null);
        piecesLost.push(p);
        // a 'lost' piece also needs to be reset for next time
        // it is used (see StepBees issue #59 on Github)
        if (lostFunc) lostFunc.call(this, p);
      }
    } else {
      piecesNew.push(p);
    }
    */
  }
  // pieces that need new entities assigned in piecesLost
  // idsActive has been shrunk to unassigned ids

  // put the new pieces on the end of the lost array
  let piecesToAssign = piecesLost.concat(piecesNew);

  // ASSIGN ORPHANED/UNASSIGNED PIECES
  for (i = 0; i < piecesToAssign.length; i++) {
    /*
    p = piecesToAssign[i];
    id = idsActive.shift();
    if (id) {
      entity = entityDict[id];
      tobj = new TrackerObject(id);
      p.SetTrackerObject(tobj);
      m_TransformAndUpdate(entity, tobj);
      tobj.Validate();
      if (addedFunc) addedFunc.call(this, p);
    } else if (DBGEDGE) console.log('ran out of entities for', p.id);
    */
  }

  /* DEBUG */
  if (!window.show_entities)
    window.show_entities = mode => {
      console.log('active tracker entities');
      if (mode !== undefined) {
        return entityDict;
      }
      let out = '\n';
      Object.keys(entityDict).forEach(key => {
        let obj = entityDict[key];
        out += `${obj.id}\t${obj.x.toFixed(2)}, ${obj.y.toFixed(2)}`;
        out += `\t${obj.nop}ms`;
        out += '\n';
      });
      out += '\n';
      return out;
    };
  // return unassigned ids (array)
  return idsActive;
} // end of MapEntities()

/// MODULE EXPORT /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// see exports above
