/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Sim Control - Control Module for Mission Control

  Handles runtime data

  This sets up all of the phase hooks that manage the running of
  the sim.

  NOTE: This should NOT be used directly by ScriptEditor or PanelScript!!!

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import RNG from 'modules/sim/sequencer';
import * as TRANSPILER from 'script/transpiler';
import * as SIM from 'modules/sim/api-sim';
import { ClearDOBJ } from 'modules/sim/sim-agents';
import * as DATACORE from 'modules/datacore';
import * as RENDERER from 'modules/render/api-render';
import { SetInputStageBounds, SetInputBPnames } from 'modules/datacore/dc-inputs';
import { GetBoundary, SendBoundary } from 'modules/datacore/dc-project';
import { GetInputBPNames } from './project-data';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PR = UR.PrefixUtil('SimControl');
const DBG = false;

/// CLASS DEFINTION ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class SimControl {
  constructor() {
    // RUN HANDLERS -----------------------------------------------------------
    this.SimPlaces = this.SimPlaces.bind(this);
    this.DoSimReset = this.DoSimReset.bind(this);
    this.DoSimStart = this.DoSimStart.bind(this);
    this.DoSimStop = this.DoSimStop.bind(this);
    this.IsRunning = this.IsRunning.bind(this);
    // Let MissionControl handle NET:HACK_SIM_RESET, then call this.DoSimReset directly.
    // UR.HandleMessage('NET:HACK_SIM_RESET', this.DoSimReset);
    UR.HandleMessage('NET:HACK_SIM_START', this.DoSimStart);
    UR.HandleMessage('NET:HACK_SIM_STOP', this.DoSimStop);

    // SYSTEM HOOKS ///////////////////////////////////////////////////////////
    // SendInspectorUpdate see LoadModel
  }

  /// RUN HANDLERS //////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   * Compiles blueprints after model loading.
   * Also updates the boundary display (since model might define new boundaries)
   */
  SimPlaces(model) {
    if (DBG) console.warn(...PR('DoSimPlaces! Compiling...'));
    // Skip if no model is loaded
    if (!model) return;

    // 2. Show Boundary
    const boundary = GetBoundary();
    RENDERER.SetBoundary(boundary.width, boundary.height, boundary.bgcolor);
    // And Set Listeners too
    SendBoundary();

    // 3. Update Input System
    //    Set Input transforms
    SetInputStageBounds(boundary.width, boundary.height); // dc-inputs
    //    Set Input controlled agents
    const inputBPnames = GetInputBPNames();
    SetInputBPnames(inputBPnames); // dc-inputs
    UR.RaiseMessage('NET:SET_INPUT_BPNAMES', { bpnames: inputBPnames });

    // 4. Compile All Agents
    const scripts = model.scripts;
    const sources = scripts.map(s => TRANSPILER.ScriptifyText(s.script));
    const bundles = sources.map(s => TRANSPILER.CompileBlueprint(s));
    const blueprints = bundles.map(b => TRANSPILER.RegisterBlueprint(b));
    const blueprintNames = blueprints.map(b => b.name);

    // 5. Create/Update All Instances
    const instancesSpec = model.instances;
    UR.RaiseMessage('ALL_AGENTS_PROGRAM', {
      blueprintNames,
      instancesSpec
    });

    // 6. Update Agent Display
    //    Agent displays are automatically updated during SIM/VIS_UPDATE
    // 7. Update Inspectors
    //    Inspectors will be automatically updated during SIM/UI_UPDATE phase
  }

  /**
   * WARNINGS:
   * * Do not call this before the simulation has loaded.
   * * Do not call this directly.  The call should originate from MissionControl
   */
  DoSimReset() {
    DATACORE.DeleteAllTests();
    // DATACORE.DeleteAllGlobalConditions(); // removed in script-xp branch
    DATACORE.DeleteAllScriptEvents();
    DATACORE.DeleteAllBlueprints();
    DATACORE.DeleteAllAgents();
    DATACORE.DeleteAllInstances();

    ClearDOBJ();

    SIM.Reset();
    // MissionControl will take care of reloading and calling SimPlaces
  }

  DoSimStart() {
    SIM.Start();
  }

  DoSimStop() {
    SIM.End();
  }

  IsRunning() {
    return SIM.IsRunning();
  }
}

const SIMCTRL = new SimControl();

export default SIMCTRL;
