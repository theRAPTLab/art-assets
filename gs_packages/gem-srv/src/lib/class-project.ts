/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Project Core Data Object

  This is the data structure for defining a project (a set of blueprints,
  instances, specification of rounds and general stage setup, e.g. bounds
  corresponding to a particular phenomean, e.g. "Moths")

  It loads and initiates the appcore modules (and group state managers)
  for metadata, rounds, blueprints, and instances.

  Used by:
  * dc-project

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { IbpidListItem } from 'lib/t-ui.d';
import * as ACMetadata from '../modules/appcore/ac-metadata';
import * as ACRounds from '../modules/appcore/ac-rounds';
import * as ACBlueprints from '../modules/appcore/ac-blueprints';

import ProjectMetadata from './class-project-meta';
import ProjectRound from './class-project-round';
import ProjectBlueprint from './class-project-blueprint';
import ProjectInstance from './class-project-instance';

/// CLASS DEFINITIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default class Project {
  // Core
  private _id: any; // id of project object
  private _slug: string; // project name url, e.g. `?model=aquatic`
  private _label: string;
  // Settings
  private _metadata: ProjectMetadata;
  // Definitions
  private _rounds: ProjectRound[];
  private _blueprints: ProjectBlueprint[];
  private _instances: ProjectInstance[];

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  constructor(id = '0') {
    this.init(id);
  }

  init(id: string) {
    this._id = id;
    this._label = '';
    this._metadata = new ProjectMetadata(id);
    this._rounds = [];
    this._blueprints = [];
    this._instances = [];
  }

  read(def: {
    id: string;
    label: string;
    metadata: any;
    rounds: any[];
    blueprints: any[];
    instances: any[];
  }) {
    this._id = def.id !== undefined ? def.id : this._id;
    this._label = def.label !== undefined ? def.label : this._label;
    this._metadata.read(def.metadata);
    this._rounds = def.rounds.map(r => new ProjectRound(r));
    this._blueprints = def.blueprints.map(b => new ProjectBlueprint(b));
    this._instances = def.instances.map(i => new ProjectInstance(i));

    // Init AppCore (AC) modules
    ACMetadata.updateAndPublish(def.id, def.metadata);
    ACRounds.updateAndPublish(def.id, def.rounds);
    ACBlueprints.updateAndPublish(def.id, def.blueprints);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// CORE

  // getter syntax used as sobj.id, not sobj.id();
  // using this form allows us to intercept and add our own logic
  get id(): any {
    return this._id;
  }
  // setter syntax used as sobj.id = 0, not sobj.id(0);
  // using this form allows us to intercept and add our own logic
  set id(val: any) {
    this._id = val;
  }

  get label(): string {
    return this._label;
  }
  set label(val: string) {
    this._label = val;
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// SETTINGS

  get metadata(): ProjectMetadata {
    return this._metadata;
  }
  set metadata(val: ProjectMetadata) {
    this._metadata = val;
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// DEFINITIONS
  ///
  /// In general, don't use these getters/setters!  Use the API!
  get rounds(): ProjectRound[] {
    return this._rounds;
  }
  set rounds(val: ProjectRound[]) {
    this._rounds = val;
  }
  get blueprints(): ProjectBlueprint[] {
    return this._blueprints;
  }
  set blueprints(val: ProjectBlueprint[]) {
    this._blueprints = val;
  }
  get instances(): ProjectInstance[] {
    return this._instances;
  }
  set instances(val: ProjectInstance[]) {
    this._instances = val;
  }

  /// API /////////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// METADATA

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// ROUNDS
  GetRound(id) {
    return this.rounds.find(r => r.id === id);
  }
  SetRound(id, updatedRound) {
    const index = this.rounds.findIndex(r => r.id === id);
    this.rounds[index] = { ...updatedRound }; // copy
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// BLUEPRINTS

  GetBlueprint(id) {
    return this.blueprints.find(s => s.id === id);
  }
  SetBlueprint(id, updatedBlueprint) {
    const index = this.blueprints.findIndex(s => s.id === id);
    this.blueprints[index] = { ...updatedBlueprint }; // copy
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// INSTANCES
  GetInstance(id) {
    return this.instances.find(i => i.id === id);
  }
  SetInstance(id, updatedInstance) {
    const index = this.instances.findIndex(i => i.id === id);
    this.instances[index] = { ...updatedInstance }; // copy
  }
  /**
   * Returns array of instance ids + labels defined for a project
   * Generally used by selector UI for `instanceList` objects
   * @returns [...{id, label, blueprint}]
   */
  GetInstancesList(): any[] {
    return this.instances.map(i => {
      return { id: i.id, label: i.label, bpid: i.bpid };
    });
  }
}
