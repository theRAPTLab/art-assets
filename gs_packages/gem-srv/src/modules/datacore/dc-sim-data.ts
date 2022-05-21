/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  DATACORE SIMULATION RESOURCES

  Contains dictionaries of the active entities available to the simulation
  engine that determine its runtime state. Prior to this module, the
  dictionaries were scattered across separate datacore modules which made
  it hard to see the distinct systems we support in addition o the simulator

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import SM_Bundle from 'lib/class-sm-bundle';
import { EBundleType } from 'modules/../types/t-script.d'; // workaround to import as obj
import * as CHECK from './dc-sim-data-utils';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const FEATURES: Map<string, IFeature> = new Map();
const BLUEPRINTS: Map<string, SM_Bundle> = new Map();
const KEYWORDS: Map<string, IKeyword> = new Map();
const VARS: Map<string, IScopeableCtor> = new Map();
const EVENT_SCRIPTS: Map<string, Map<string, TSMCProgram>> = new Map();
const TEST_SCRIPTS: Map<string, TSMCProgram> = new Map();
const NAMED_SCRIPTS: Map<string, TSMCProgram> = new Map();
const NAMED_FUNCTIONS: Map<string, Function> = new Map();

/// FEATURES ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Retrieve a feature module by its name and return its instance */
function GetFeature(fName: string): IFeature {
  return FEATURES.get(fName);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetAllFeatures() {
  return FEATURES;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** retrieve a method from a feature instance */
function GetFeatureMethod(fName: string, mName: string) {
  return GetFeature(fName)[mName];
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Register a feature module by name (as defined in the feature class */
function RegisterFeature(fpack: IFeature) {
  FEATURES.set(fpack.name, fpack);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function DeleteAllFeatures() {
  FEATURES.clear();
}

/// BLUEPRINT /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Blueprints are an object containing the elements of a 'transpiled'
/// blueprint scriptText, and are used to instantiate characters in the
/// simulation engine
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: saves the blueprint, using bp.name property as the key */
function SaveBlueprintBundle(bdl: SM_Bundle) {
  const fn = 'SaveBlueprintBundle:';
  if (bdl.type === EBundleType.INIT) {
    return undefined;
  }
  const { name } = bdl;
  // just overwrite it
  BLUEPRINTS.set(name, bdl);
  return bdl;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return a blueprint bundle by bpName */
function GetBlueprintBundle(bpName: string): SM_Bundle {
  const fn = 'GetBlueprintBundle:';
  bpName = bpName || 'default';
  let bdl = BLUEPRINTS.get(bpName);
  if (bdl === undefined) {
    if (DBG) console.log(`${fn} creating '${bpName}' bundle on request`);
    bdl = new SM_Bundle(bpName, EBundleType.BLUEPRINT);
  }
  return bdl;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return an array of all the blueprint bundles in the engine */
function GetAllBlueprintBundles(): SM_Bundle[] {
  const arr = [];
  const maps = [...BLUEPRINTS.values()];
  maps.forEach(map => {
    arr.push(map);
  });
  return arr;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return an array of blueprint names string */
function GetBlueprintBundleList(): string[] {
  return [...BLUEPRINTS.keys()];
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: delete blueprint bundle by name */
function DeleteBlueprintBundle(bpName: string): void {
  if (!BLUEPRINTS.has(bpName)) {
    console.warn(`trying to delete non-existent blueprint '${bpName}'`);
  }
  BLUEPRINTS.delete(bpName);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: delete all blueprint bundles. Used when clearing sim engine state. */
function DeleteAllBlueprintBundles(): void {
  BLUEPRINTS.clear();
}

/// KEYWORDS //////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// The GEMSTEP transpiler script language is built from 'keyword' modules
/// that can compile a 'decoded script tokens' into a compiled output,
/// symbols, or validated against syntax rules. See class-keyword.ts and
/// transpiler.ts for examples of use
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: variable types (e.g. gvar-number.ts is the type of a 'number' prop
 *  have to be declared and registered to be available to the transpiler
 */
function RegisterKeyword(Ctor: IKeywordCtor, key?: string): void {
  const fn = 'RegisterKeyword:';
  const kobj = new Ctor();
  if (!CHECK.AreValidArgs(kobj.args as TSymArg[]))
    throw Error(`${fn} invalid argDef in keyword '${kobj.keyword}'`);
  KEYWORDS.set(key || kobj.keyword, kobj);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return a registered keyword module */
function GetKeyword(name: string): IKeyword {
  return KEYWORDS.get(name);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return the list of all registered keywords */
function GetAllKeywords(): string[] {
  const arr = [];
  KEYWORDS.forEach((value, key) => {
    arr.push(key);
  });
  return arr;
}

/// VALUE TYPE UTILITIES //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given a SMObject, store in VARS dict */
function RegisterVarCTor(propType: string, ctor) {
  if (VARS.has(propType)) throw Error(`RegisterVarCTor: ${propType} exists`);
  VARS.set(propType, ctor);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: get the registered SMObject constructor by name */
function GetVarCtor(propType: string): IScopeableCtor {
  if (!VARS.has(propType)) throw Error(`GetVarCtor: ${propType} `);
  return VARS.get(propType);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: return the VAR ctor dictionary */
function GetPropTypesDict(): Map<string, IScopeableCtor> {
  return VARS;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: get symbol data for a named type (e.g. 'number') */
function SymbolDefFor(propType: string): TSymbolData {
  const def = VARS.get(propType);
  if (def) return def.Symbols;
}

/// TEST DICTIONARIES /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** returns true if test was saved for the first time, false otherwise */
function RegisterTest(name: string, program: TSMCProgram): boolean {
  // if (TESTS.has(name)) throw Error(`RegisterTest: ${name} exists`);
  const newRegistration = !TEST_SCRIPTS.has(name);
  TEST_SCRIPTS.set(name, program);
  return newRegistration;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetTest(name: string): TSMCProgram {
  return TEST_SCRIPTS.get(name);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function DeleteAllTests() {
  TEST_SCRIPTS.clear();
}

/// NAMED PROGRAM DICTIONARIES ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RegisterProgram(name: string, program: TSMCProgram) {
  if (NAMED_SCRIPTS.has(name)) throw Error(`RegisterProgram: ${name} exists`);
  NAMED_SCRIPTS.set(name, program);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetProgram(name: string): TSMCProgram {
  return NAMED_SCRIPTS.get(name);
}

/// NAMED FUNCTIONS DICTIONARIES //////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RegisterFunction(name: string, func: Function): boolean {
  const newRegistration = !NAMED_FUNCTIONS.has(name);
  NAMED_FUNCTIONS.set(name, func);
  return newRegistration;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetFunction(name: string): Function {
  let f = NAMED_FUNCTIONS.get(name);
  // return always random results if the test doesn't exist
  if (!f) f = () => Math.random() > 0.5;
  return f;
}

/// DEPRECATED - MOVE TO FEAT VISION //////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Returns the SCALED bounding rect of the agent
export function GetAgentBoundingRect(agent) {
  // Based on costume
  if (!agent.hasFeature('Costume'))
    throw new Error(
      `GetAgentBoundingRect: Tried to use vision on an agent with no costume ${agent.id}`
    );
  const { w, h } = agent.callFeatMethod('Costume', 'getScaledBounds');
  const halfw = w / 2;
  const halfh = h / 2;
  return [
    { x: agent.x - halfw, y: agent.y - halfh },
    { x: agent.x + halfw, y: agent.y - halfh },
    { x: agent.x + halfw, y: agent.y + halfh },
    { x: agent.x - halfw, y: agent.y + halfh }
  ];
}

/// SCRIPT EVENTS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Register an agentset to a particular handler. It's a TSMCProgram[] (an
 *  array of program arrays consisting of a stack of functions) that will
 *  get run when the EventHandler receives it.
 *  SCRIPT_EVENTS: Map<string, Map<string,TSMCProgram[]>> = new Map();
 *                eventName->Map(blueprintName)->TSMCProgram[]
 */
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function SubscribeToScriptEvent(
  evtName: string,
  bpName: string,
  consq: TSMCProgram
) {
  if (!EVENT_SCRIPTS.has(evtName)) EVENT_SCRIPTS.set(evtName, new Map());
  const subbedBPs = EVENT_SCRIPTS.get(evtName); // event->blueprint codearr
  if (!subbedBPs.has(bpName)) subbedBPs.set(bpName, []);
  // get the blueprint array for bpName, created if necessary
  const codearr = subbedBPs.get(bpName);
  if (typeof consq === 'function') codearr.push(consq);
  else codearr.push(...consq);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetScriptEventHandlers(evtName: string) {
  if (!EVENT_SCRIPTS.has(evtName)) EVENT_SCRIPTS.set(evtName, new Map());
  const subbedBPs = EVENT_SCRIPTS.get(evtName); // event->blueprint codearr
  const handlers = [];
  subbedBPs.forEach((handler, agentType) => {
    handlers.push({ agentType, handler });
  });
  return handlers;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function DeleteAllScriptEvents() {
  EVENT_SCRIPTS.clear();
}

/// MODULE EXPORTS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// blueprints are stored as "bundles" by their name
export {
  SaveBlueprintBundle,
  GetBlueprintBundle,
  GetAllBlueprintBundles,
  GetBlueprintBundleList,
  DeleteBlueprintBundle,
  DeleteAllBlueprintBundles
};
/// scriptable properties are called "gvars" and have constructors for each type
export { RegisterVarCTor, GetVarCtor, SymbolDefFor, GetPropTypesDict };
/// the transpiler is extendable using "keyword' modules that implement
/// symbolize, validate, and compile
export { RegisterKeyword, GetKeyword, GetAllKeywords };
/// engine maintains dicts of named Javascript functions
export { RegisterFunction, GetFunction };
/// engine maintain dicts of compiler script code (TSMCProgram)
export { RegisterProgram, GetProgram };
/// "when" conditions use programs that expect a certain input
export { RegisterTest, GetTest, DeleteAllTests };
/// extensions to the script engine capabilities are handled with "feature" modules
export {
  GetFeature,
  GetAllFeatures,
  GetFeatureMethod,
  RegisterFeature,
  DeleteAllFeatures
};
/// simulation triggers are managed through "script event" dicts
export { SubscribeToScriptEvent, GetScriptEventHandlers, DeleteAllScriptEvents };

/* exports from dc-script-engine that are no longer exported
export { BLUEPRINTS, KEYWORDS, SCRIPTS, SCRIPT_EVENTS };
  SaveScript,
  DeleteScript,
  UpdateScriptIndex,
  //
  UnpackArg,
  AreValidArgs,
  UtilDerefArg,
  UtilFirstValue
};
export {
  UnpackToken,
  IsValidToken,
  IsValidTokenType,
  TokenValue
} from 'script/tools/class-gscript-tokenizer-v2';
*/