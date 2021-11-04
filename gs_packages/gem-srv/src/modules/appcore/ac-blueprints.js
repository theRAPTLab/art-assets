/* eslint-disable @typescript-eslint/no-unused-vars */
/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Manage blueprints lists

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import * as TRANSPILER from 'script/transpiler-v2';
import Blueprint from '../../lib/class-project-blueprint';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PR = UR.PrefixUtil('AC-BPRNT', 'TagCyan');
const DBG = false;

/// The module name will be used as args for UR.ReadStateGroups
const STATE = new UR.class.StateGroupMgr('blueprints');
/// StateGroup keys must be unique across the entire app
STATE.initializeState({
  // dummy
  projId: 0,
  blueprints: [],
  bpidList: []
});
/// These are the primary methods you'll need to use to read and write
/// state on the behalf of code using APPCORE.
const { stateObj, flatStateValue, _getKey, updateKey } = STATE;
/// For handling state change subscribers, export these functions
const { subscribe, unsubcribe } = STATE;
/// For React components to send state changes, export this function
const { handleChange } = STATE;
/// For publishing state change, this can be used inside this module
/// DO NOT CALL THIS FROM OUTSIDE
const { _publishState } = STATE;
/// To allow outside code to modify state change requests on-the-fly,
/// export these functions
const { addChangeHook, deleteChangeHook } = STATE;
const { addEffectHook, deleteEffectHook } = STATE;

/// ACCESSORS /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// return copies

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function GetBlueprints() {
  const blueprints = _getKey('blueprints');
  return [...blueprints];
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function GetBlueprint(bpid) {
  const blueprints = _getKey('blueprints');
  return blueprints.find(b => b.id === bpid);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Returns array of blueprint definitions defined for a project
 * Generally used by selector UI for `bpidList` objects
 * Pass 'blueprint' on initia calls before the key is set
 * @returns [...{id, label}]
 */
export function GetBlueprintIDsList(blueprints) {
  const bp = blueprints || _getKey('blueprints');
  return bp.map(b => {
    return { id: b.id, label: b.label };
  });
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Returns array of blueprint ids that are CharControllable.
 * @returns [...id]
 */
export function GetCharControlBpidList(blueprints) {
  const bp = blueprints || _getKey('blueprints');
  return bp.filter(b => b.isCharControllable).map(b => b.id);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Returns array of blueprint ids that are PozyxControllable.
 * @returns [...id]
 */
export function GetPozyxControlBpidList(blueprints) {
  const bp = blueprints || _getKey('blueprints');
  return bp.filter(b => b.isPozyxControllable).map(b => b.id);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Returns the first pozyx controllable blueprint as the default bp to use
 * Used dc-inputs to determine mapping
 * @returns id
 */
export function GetPozyxControlDefaultBpid() {
  const bpidList = GetPozyxControlBpidList();
  if (bpidList.length < 1) return undefined;
  return bpidList[0];
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Returns array of properties {name, type, defaultvalue, isFeatProp}
 * that have been defined by the blueprint.
 * Used to populate property menus when selecting properties to show
 * in InstanceInspectors
 * @param {string} bpid
 * @param {string} [modelId=currentModelId]
 * @return {Object[]} [...{ name, type, defaultValue, isFeatProp }]
 */
export function GetBlueprintProperties(bpid) {
  const blueprint = GetBlueprint(bpid);
  if (!blueprint) return []; // blueprint was probably deleted
  return TRANSPILER.ExtractBlueprintProperties(blueprint.scriptText);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function GetBlueprintPropertiesMap(bpid) {
  const blueprint = GetBlueprint(bpid);
  if (!blueprint) return []; // blueprint was probably deleted
  return TRANSPILER.ExtractBlueprintPropertiesMap(blueprint.scriptText);
}

/// LOADER ////////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function updateAndPublish(blueprints) {
  const bpidList = GetBlueprintIDsList(blueprints);
  updateKey({ blueprints, bpidList });
  _publishState({ blueprints, bpidList });
}

/// INTERCEPT STATE UPDATE ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let AUTOTIMER;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Intercept changes to blueprints so we can cache the changes
 *  for later write to DB after some time has elapsed. Returns the modified
 *  values, if any, for subsequent update to GSTATE and publishState.
 *
 *  You don't need to use this if you are not filtering data before it being
 *  saved. You can also optionally return NOTHING; returning an array forces
 *  the rewrite to occur, otherwise nothing happens and the change data is
 *  written as-is.
 */
function hook_Filter(key, propOrValue, propValue) {
  if (DBG) console.log('ac-blueprints: hook_Filter', key, propOrValue, propValue);
  // No need to return anything if data is not being filtered.
  // if (key === 'rounds') return [key, propOrValue, propValue];
  // return undefined;
  if (key === 'blueprints') {
    // update and publish bpidList too
    const bpidList = GetBlueprintIDsList(propOrValue);
    updateKey({ bpidList });
    _publishState({ bpidList });
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Optionally fire once all state change hooks have been processed.
 *  This is provided as the second arg of addChangeHook()
 */
function hook_Effect(effectKey, propOrValue, propValue) {
  if (DBG) console.log('hook_Effect called', effectKey, propOrValue, propValue);
  if (effectKey === 'blueprints') {
    if (DBG) console.log(...PR(`effect ${effectKey} = ${propOrValue}`));
    // (a) start async autosave
    if (AUTOTIMER) clearInterval(AUTOTIMER);
    AUTOTIMER = setInterval(() => {
      const projId = _getKey('projId');
      const blueprints = propOrValue;
      UR.CallMessage('LOCAL:DC_WRITE_BLUEPRINTS', {
        projId,
        blueprints
      }).then(status => {
        const { err } = status;
        if (err) console.error(err);
        return status;
      });
      clearInterval(AUTOTIMER);
      AUTOTIMER = 0;
    }, 1000);
  }
  // otherwise return nothing to handle procesing normally
}

/// ADD LOCAL MODULE HOOKS ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
addChangeHook(hook_Filter);
addEffectHook(hook_Effect);

/// UPDATERS //////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export function SetBlueprints(projId, blueprints) {
  updateKey({ projId });
  updateAndPublish(blueprints);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// Used to inject Cursor
export function AddBlueprint(projId, blueprintDef) {
  // Add new blueprint
  const def = {
    id: blueprintDef.id,
    label: blueprintDef.label,
    isCharControllable: blueprintDef.isCharControllable, // defaul to false?
    isPozyxControllable: blueprintDef.isPozyxControllable,
    scriptText: blueprintDef.scriptText
  };
  const bp = new Blueprint(def);
  const blueprints = _getKey('blueprints');
  blueprints.push(bp.get());

  // NOTE: Not updating state, nor writing to db
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export function UpdateBlueprint(projId, bpid, scriptText) {
  const blueprints = _getKey('blueprints');
  const index = blueprints.findIndex(b => b.id === bpid);
  console.log('updatebluperint', bpid, scriptText);
  if (index > -1) {
    // Replace existing blueprint
    const blueprint = {
      ...blueprints[index]
    }; // clone
    // Update the script
    blueprint.scriptText = scriptText;
    blueprints[index] = blueprint;
  } else {
    // Add new blueprint
    // This is also called if the name of the blueprint changed
    // (the old one is deleted)
    const def = {
      id: bpid,
      label: bpid,
      isCharControllable: false, // defaul to false?
      isPozyxControllable: false,
      scriptText
    };
    const blueprint = new Blueprint(def);
    blueprints.push(blueprint.get());
  }
  updateKey({ projId });
  updateAndPublish(blueprints);
  console.error('...updating blueprints to', blueprints);
  UR.WriteState('blueprints', 'blueprints', blueprints);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export function DeleteBlueprint(bpid) {
  const blueprints = _getKey('blueprints');
  const index = blueprints.findIndex(b => b.id === bpid);
  if (index < 0) {
    console.warn(...PR(`Trying to delete non-existent bpid ${bpid}`));
    return;
  }
  blueprints.splice(index, 1);
  // REVIEW: This can potentially trigger multiple state updates
  //         See sim-agents.AllAgentsProgram / FilterBlueprints
  //         Do we need a way to do multiple deletes with a delayed
  //         state update?
  UR.WriteState('blueprints', 'blueprints', blueprints);
}

/// PHASE MACHINE DIRECT INTERFACE ////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Handled by class-project