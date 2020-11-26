/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Agents Phase Machine Interface

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import SyncMap from 'lib/class-syncmap';
import DisplayObject from 'lib/class-display-object';
import {
  GetAllAgents,
  DeleteAllAgents,
  DeleteAllTests
} from 'modules/runtime-datacore';
import * as RENDERER from 'modules/render/api-render';
import { MakeDraggable } from 'lib/vis/draggable';
import * as TRANSPILER from 'script/transpiler';

/// CONSTANTS AND DECLARATIONS ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PR = UR.PrefixUtil('SIM_AGENTS');
const DBG = true;
const DO_TESTS = !UR.IsRoute('/app/compiler');

const DOBJ_SYNC_AGENT = new SyncMap('AgentToDOBJ', {
  Constructor: DisplayObject,
  autoGrow: true
});

DOBJ_SYNC_AGENT.setMapFunctions({
  onAdd: (agent, dobj) => {
    dobj.x = agent.x();
    dobj.y = agent.y();
    dobj.skin = agent.skin();
    dobj.frame = agent.prop('frame').value;
    dobj.mode = agent.mode();
    dobj.dragging = agent.isCaptive;
  },
  onUpdate: (agent, dobj) => {
    dobj.x = agent.x();
    dobj.y = agent.y();
    dobj.skin = agent.skin();
    dobj.frame = agent.prop('frame').value;
    dobj.mode = agent.mode();
    dobj.dragging = agent.isCaptive;
  }
});

/// CONSOLE-LEFT STATUS FAKERY ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// CONSOLE
let HCON;
let FCON;
let X = 0;
let INC = 1;
const ZIP = '=@=';
const ZIP_BLNK = ''.padEnd(ZIP.length, ' ');
// UR.SystemHook('SIM/VIS_UPDATE', frameCount => {
//   HCON.plot(`framecount: ${frameCount}`, 1);
//   if (frameCount % 6) return;
//   HCON.plot(ZIP_BLNK, 3, X);
//   X += INC;
//   HCON.plot(ZIP, 3, X);
//   const XS = `${X}`.padStart(3, ' ');
//   HCON.plot(`X: ${XS}`, 5);
//   if (X < 1) INC = 1;
//   if (X > 24) INC = -1;
//   if (Math.random() > 0.5) {
//     HCON.gotoRow(6);
//     HCON.print(`dummy datalog: ${Math.random().toFixed(2)}`);
//   }
//   if (Math.random() > 0.95) HCON.clear(6);
// });

/// PROGRAMMING INTERFACE /////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AgentSelect() {}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** placeholder */
export function AgentProgram(blueprint) {
  DeleteAllAgents();
  if (!blueprint) return console.warn(...PR('no blueprint'));
  for (let i = 0; i < 20; i++) TRANSPILER.MakeAgent(`bun${i}`, { blueprint });
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AgentUpdate(frameTime) {
  // HACK: execute agent program for default agent
  const tagents = GetAllAgents();
  tagents.forEach(agent => {
    agent.update(frameTime);
    /* run update */
  });
  tagents.forEach(agent => {
    /* run queued exec */
  });

  // TEMP HACK: force the agents to move outside of programming
  // by diddling their properties directly
  // also see renderer.js for TestRenderParameters()
  //
  // TestJitterAgents(frameTime);

  // TEMP HACK: This should move to the DisplayListOut phase
  // force agent movement for display list testing
  const agents = GetAllAgents();
  DOBJ_SYNC_AGENT.syncFromArray(agents);
  DOBJ_SYNC_AGENT.mapObjects();
  const dobjs = DOBJ_SYNC_AGENT.getMappedObjects();
  RENDERER.UpdateDisplayList(dobjs);
  UR.SendMessage('NET:DISPLAY_LIST', dobjs);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AgentThink(frameTime) {}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AgentExec(frameTime) {
  const agents = GetAllAgents();
  agents.forEach(agent => {
    /* exec function */
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AgentReset(frameTime) {
  /* reset agent */
}

/// ASYNC MESSAGE INTERFACE ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
UR.RegisterMessage('SIM_RESET', AgentReset);
UR.RegisterMessage('SIM_MODE', AgentSelect);
// UR.RegisterMessage('SIM_PROGRAM', AgentProgram);
UR.RegisterMessage('AGENT_PROGRAM', AgentProgram);

/// PHASE MACHINE DIRECT INTERFACE ////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
UR.SystemHook('SIM/AGENTS_UPDATE', AgentUpdate);
UR.SystemHook('SIM/AGENTS_THINK', AgentThink);
UR.SystemHook('SIM/AGENTS_EXEC', AgentExec);

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default {};
