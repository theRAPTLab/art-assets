/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  client-side subscriber class to the PTRACK frame server
  (1) pt.Connect() to establish socket connection
  (2) entity data is processed behind-the-scenes automatically
  (3) pt.GetEntityDict() returns the dictionary of current objects

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import { EntityObject, FrameStatus } from './t-ptrack';
import DEF from './plae-def';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PR = UR.PrefixUtil('PTRAK');

/// CLASS DEFINITIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default class PTrack {
  input_socket: {
    onmessage?: Function;
  };
  socketAddress: string;
  N_ENTITIES: number;
  entityDict: Map<string, EntityObject>;
  connectStatusDict: Map<string, FrameStatus>;
  descriptor: {}; // vestigial...should remove
  //
  constructor() {
    this.input_socket = {};
    this.socketAddress = 'ws://localhost:3030';
    this.N_ENTITIES = 15;
    this.entityDict = new Map();

    // 2.0 infer the connection status of PTRACK with our system
    this.connectStatusDict = new Map();
    // descriptor, used for input module enumeration
    this.descriptor = {
      name: 'PTrack',
      type: 'tracker',
      maxTrack: 15,
      id: null,
      instance: this
    };
  }

  Initialize() {
    console.log(...PR('deprecated Initialize()'));
  }

  SetServerDomain(serverAddress: string) {
    this.socketAddress = `ws://${serverAddress}:3030`;
  }

  Connect() {
    this.input_socket = new WebSocket(this.socketAddress);
    this.input_socket.onmessage = event => {
      this.ProcessFrame(event.data); // new routine
    };
  }

  GetDescriptor() {
    return this.descriptor;
  }

  GetEntityDict() {
    return this.entityDict;
  }

  /// PROCESS FRAME /////////////////////////////////////////////////////////////
  /*- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -*:
    This is an enormous block of code ported as-is from PLAE, with minor
    fixes to syntax. It is the last method of this class, and it contains
    two internal functions parseTracks() and isBadData() that depend on the
    local variables declared therein
  :*- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -*/
  ProcessFrame(frameData: string) {
    // frame.header: { seq: stamp:{sec: nsec:} frame_id: }
    // frame.people_tracks: [ { id: x: y: height: } ... ]
    let frame;
    let subtype;
    let frame_seq;
    let frame_sec;
    let frame_nsec;
    let frame_id;
    let frame_entities;
    let short_id;

    /// HELPER FUNCTIONS //////////////////////////////////////////////////////
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// this is used in the switch statement below!
    function parseTracks() {
      let ok = false;

      // this construction will catch the anomalous case
      // where BOTH People and Objects exist (this shouldn't happen)
      if (frame.people_tracks) {
        subtype += DEF.ENUM.PTRACK_TYPES.People;
        frame_entities = frame.people_tracks.length;
        ok = true;
      }
      if (frame.object_tracks) {
        if (subtype)
          throw new Error(
            `both people and objects defined in same ptrack world frame seq# ${frame_seq}`
          );
        subtype += DEF.ENUM.PTRACK_TYPES.Object;
        frame_entities = frame.object_tracks.length;
        ok = true;
      }
      if (frame.pose_tracks) {
        if (subtype)
          throw new Error(
            `both pose and people or objects defined in same ptrack world frame seq# ${frame_seq}`
          );
        subtype += DEF.ENUM.PTRACK_TYPES.Pose;
        frame_entities = frame.pose_tracks.length;
        ok = true;
      }
      if (frame.fake_tracks) {
        if (subtype)
          throw new Error(
            `both pose and people or objects and fake_tracks defined in same ptrack world frame seq# ${frame_seq}`
          );
        subtype += DEF.ENUM.PTRACK_TYPES.Faketrack;
        frame_entities = frame.fake_tracks.length;
        ok = true;
      }
      if (frame.tracks) {
        if (subtype)
          throw new Error(
            `both original 14.04 ptrack people and new 16.04+ people defined in same ptrack world frame seq# ${frame_seq}`
          );
        subtype += DEF.ENUM.PTRACK_TYPES.People;
        frame_entities = frame.tracks.length;
        ok = true;
      }
      if (!ok)
        throw new Error(
          `frame ${frame_id}/${frame_seq} has no people or object tracks defined.`
        );
    }
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// this is used in the for loop to reject bad data
    function hasBadData(raw) {
      let isGood = true;
      if (raw.orientation) {
        isGood = isGood && typeof raw.orientation === 'number';
      }
      if (raw.x !== undefined) {
        isGood = isGood && typeof raw.x === 'number';
      }
      if (raw.y !== undefined) {
        isGood = isGood && typeof raw.y === 'number';
      }
      return !isGood;
    }

    /// START PROCESSING FRAME ////////////////////////////////////////////////
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// (1) Get packet and verify its structure
    try {
      frame = JSON.parse(frameData);
    } catch (e) {
      console.log('*** PROCESS FRAME Bad JSON', e);
    }
    // check for valid header
    if (!frame.header === undefined) throw new Error('missing ptrack header');
    if (!frame.header.seq === undefined)
      throw new Error('missing ptrack header.seq');
    if (!frame.header.stamp === undefined)
      throw new Error('missing header.stamp');
    if (!frame.header.frame_id) throw new Error('missing header.frame_id');
    frame_seq = frame.header.seq;
    frame_sec = frame.header.stamp.sec;
    frame_nsec = frame.header.stamp.nsec;
    frame_id = frame.header.frame_id;

    // world frames can contain EITHER people or objects, so have to detect
    // this difference to determine how to save in this.connectStatusDict dictionary
    subtype = '';

    // check for valid frame_id types
    switch (frame_id) {
      case 'world':
        parseTracks();
        short_id = 'PTrak';
        break;
      case 'faketrack':
        parseTracks();
        short_id = 'FTrak';
        break;
      case 'heartbeat':
        if (!frame.alive_IDs)
          throw new Error('missing alive_IDs in heartbeat frame');
        frame_entities = frame.alive_IDs.length;
        short_id = 'Hbeat';
        break;
      default:
        throw new Error(`unknown frame_id type ${frame_id.bracket()}`);
    }

    // check for faketrack 'fake_id' to modify subtype
    subtype += frame.fake_id ? `-${frame.fake_id}` : '';

    // save "last seen" data in connectStatus dictionary
    // key by subtype, value = { lastseq, lastsec, lastnsec, lastcount }
    let dictkey = `${short_id}-${subtype}`;
    let statobj = this.connectStatusDict[dictkey] || {};
    // HACK Don't check for out of sequence frames because ptrack frame ids are not unique.
    //		// check for out-of-sequence OpenPTRACK frames, but ignore faketrack since we allow multiples
    //		if (frame_id!=='faketrack' && statobj.lastseq) {
    //			let d = frame_seq - statobj.lastseq;
    //			if (d<1) throw new Error('unexpected jump of '+d+' in sequence number for frame '+frame_id.bracket()+':'+frame_seq+' (source:'+short_id);
    //		}

    // save data for this dictkey
    statobj.lastseq = frame_seq;
    statobj.lastsec = frame_sec;
    statobj.lastnsec = frame_nsec;
    statobj.lastcount = frame_entities;

    // resave "last seen" data in connectStatus
    this.connectStatusDict[dictkey] = statobj;

    // (2) process track data
    // REMAP says that it's UNLIKELY that there will be a packet
    // with BOTH object_tracks and people_tracks
    let tracks;
    let trackType;

    // are there object or people tracks?
    if (frame.object_tracks && frame.object_tracks.length > 0) {
      tracks = frame.object_tracks;
      trackType = DEF.ENUM.PTRACK_TYPES.Object;
    } else if (frame.people_tracks && frame.people_tracks.length > 0) {
      tracks = frame.people_tracks;
      trackType = DEF.ENUM.PTRACK_TYPES.People;
    } else if (frame.pose_tracks && frame.pose_tracks.length > 0) {
      tracks = frame.pose_tracks;
      trackType = DEF.ENUM.PTRACK_TYPES.Pose;
    } else if (frame.fake_tracks && frame.fake_tracks.length > 0) {
      tracks = frame.fake_tracks;
      trackType = DEF.ENUM.PTRACK_TYPES.Faketrack;
    } else if (frame.tracks && frame.tracks.length > 0) {
      // support for original 14.04 ptrack data format, ca PLAE spring 2017 study (pre-pose, pre-props)
      tracks = frame.tracks;
      trackType = DEF.ENUM.PTRACK_TYPES.People;
    } else {
      // no tracks
      return;
    }

    // process entities in track into to the 'entity dictionary'
    // that's used by INPUT managers
    // .. see if raw.id exists in entityDict
    // .. if not, create new object with nop 0
    // .. if exist, update object
    tracks.forEach(i => {
      let raw = tracks[i];
      if (hasBadData(raw)) return;

      // HACK ***
      // If the track is pose data
      // and joints or chests are malformed, we can end up with NaN x and y
      // So we avoid updating the entityDict if the data appears malformed.
      // This should probably be put in the hasBadData function.
      if (
        trackType === DEF.ENUM.PTRACK_TYPES.Pose &&
        (raw.joints === undefined ||
          raw.joints.CHEST === undefined ||
          raw.joints.CHEST.x === undefined ||
          typeof raw.joints.CHEST.x !== 'number' ||
          raw.joints.CHEST.y === undefined ||
          typeof raw.joints.CHEST.y !== 'number')
      ) {
        return;
      }

      raw.id = trackType + raw.id; // attach type to guarantee unique id

      let ent = this.entityDict[raw.id];
      if (ent) {
        ent.id = raw.id;
        ent.x = raw.x;
        ent.y = raw.y;
        ent.h = raw.height;
        // ent.age;                           // don't reset this to zero!
        ent.nop = 0; // new frame, so reset no-op timer
        ent.name = raw.object_name; // object tracks only, otherwise undefined
        ent.pose = raw.predicted_pose_name; // pose tracks only, otherwise undefined
        ent.isFaketrack = raw.isFaketrack; // faketrack tracks only, otherwise undefined
      } else {
        this.entityDict[raw.id] = {
          id: raw.id,
          x: raw.x,
          y: raw.y,
          h: raw.height,
          age: 0,
          nop: 0,
          type: trackType,
          name: raw.object_name, // object tracks only, otherwise undefined
          pose: raw.predicted_pose_name, // pose tracks only, otherwise undefined
          isFaketrack: raw.isFaketrack // faketrack tracks only, otherwise undefined
        };
      }
      if (trackType === DEF.ENUM.PTRACK_TYPES.Object) {
        //console.log('object confidence',raw.object_name, raw.confidence);
      }
      // Check poses
      // We already checked for existense and validity of joints and chest above
      // so no need to recheck  here.
      if (trackType === DEF.ENUM.PTRACK_TYPES.Pose) {
        // copy name over for display purposes in tracker utility
        this.entityDict[raw.id].name = raw.predicted_pose_name;
        // x,y from poses is set from the CHEST joint
        // .. make sure the joints exist
        this.entityDict[raw.id].joints = raw.joints;
        this.entityDict[raw.id].x = raw.joints.CHEST.x;
        this.entityDict[raw.id].y = raw.joints.CHEST.y;
        // orientation
        this.entityDict[raw.id].orientation = raw.orientation; // in radians
      }

      // 2018-02-11 Commented out old code in favor of heavy error checking above
      // 			if (trackType===DEF.ENUM.PTRACK_TYPES.Pose) {
      // 				// copy name over for display purposes in tracker utility
      // 				this.entityDict[raw.id].name = raw.predicted_pose_name;
      // 				// x,y from poses is set from the CHEST joint
      // 				// .. make sure the joints exist
      // 				if (raw.joints) {
      // 					this.entityDict[raw.id].joints = raw.joints;
      // 					if (raw.joints.CHEST) {

      // REVIEW CODE!

      // INTERIM HACK

      // According to Marco, any data that has a NaN CHEST coordinate should be rejected.

      // Ideally, PTrack wouldn't even send that data, but since they are sending it currently,
      // we check for it here.

      // For some reason though, only "orientation" is being set to NaN, and the CHEST data
      // is being passed as 0.  So we check "orientation" instead.

      // Also, orientation is sending a string "nan" instead of NaN, so we explicitly check
      // for the string.

      // 						// if (raw.orientation == "nan") {
      // 						// 	// Reject the particle if orientation has a NaN value
      // 						// 	// console.error('rejecting "nan" orientation');
      // 						// 	delete this.entityDict[raw.id];
      // 						// 	continue;
      // 						// }
      // // 						if (isNaN(raw.joints.CHEST.x) || isNaN(raw.joints.CHEST.y)) {
      // // 							// Reject the particle if CHEST has a NaN value
      // // 							delete this.entityDict[raw.id];
      // // 							continue;
      // // 						}
      // 						if (raw.joints.CHEST.x && typeof raw.joints.CHEST.x==='number') {
      // 							this.entityDict[raw.id].x = raw.joints.CHEST.x;
      // 						}
      // 							this.entityDict[raw.id].y = raw.joints.CHEST.y;
      // 						}
      // 					}
      // 				}
      // 				// orientation
      // 				this.entityDict[raw.id].orientation = raw.orientation; // in radians
      // 			}
    }); // tracks.forEach
    // console.log(this.entityDict);
  }
}

/// INITIALIZATION ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
console.log(...PR('UR.RegisterHooks(sysloop => {})'));

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
