/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  StackMachine Type Declarations

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// STACKMACHINE TYPE DECLARATIONS ////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** A "scopeable" object is one that can represent the current execution
 *  context for ops using method(), prop() or value-related assignments.
 *  The Agent, Prop, and Feature classes implement this interface.
 */
export interface T_Scopeable {
  method: (name: string, ...args: any) => any;
  addProp: (name: string, gv: T_Scopeable) => T_Scopeable;
  addMethod: (name: String, callable: T_Method) => void;
  props: Map<string, T_Scopeable>;
  prop: (name: string) => T_Scopeable;
  methods: Map<string, T_Method>;
  serialize: () => any[];
  value: any;
}
/// AGENT TYPE DECLARATIONS ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Agents have additional properties on top of T_Scopeable */
export interface T_Agent extends T_Scopeable {
  exec_smc: (prog: T_Program, initStack?: T_Stackable[]) => T_Stackable[];
  feature: (name: string) => any;
  addFeature: (name: string) => T_Agent;
  name: () => string;
  x: () => number;
  y: () => number;
  skin: () => string;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** A "stackable" object is one that can be pushed on the data stack.
 */
export type T_Stackable = T_Scopeable;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Stackmachine operations return a Promise if it is operating asynchronously
 *  though this may not be necessary. I thought it might be cool
 */
export type T_OpWait = Promise<any> | void;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** A stackmachine maintains state in form of a data stack, a scope stack,
 *  and a flags object. This state is passed, along with agent, to every
 *  stackmachine opcode. The opcode is free to mutate the stacks and agent
 */
export class T_State {
  stack: T_Stackable[]; // data stack (pass values in/out)
  scope: T_Scopeable[]; // scope stack (current execution context)
  flags: {
    Z: boolean; // zero flag
    GT: boolean; // greater than than
    LT: boolean; // less-than, same as !(GT&&EQ)
    EQ: boolean; // equal flag
    TRUE: boolean; // if result of op was "true" after compare
    FALSE: boolean; // inverse of TRUE operation
  };
  constructor() {
    this.stack = [];
    this.scope = [];
    this.flags = {
      Z: false,
      GT: false,
      LT: false,
      EQ: false,
      TRUE: false,
      FALSE: true
    };
  }
  stackPeek() {
    return this.stack[this.stack.length - 1];
  }
  stackPop() {
    return this.stack.pop();
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** A stackmachine operation or "opcode" is a function that receives mutable
 *  agent, stack, scope, and condition flag objects. This is how agents
 *  and their props are changed by the scripting engine. The agent is
 *  the memory context, and the stack is used to pass values in/out.
 *  It returns void, but we are also allowing Promise as a return type
 *  in case we want to have asynchronous opcodes.
 */
export type T_Opcode = (
  agent: T_Agent, // REQUIRED memory context
  sm_state: T_State // machine state
) => T_OpWait;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** A stackmachine method can be either a stackmachine program OR a regular
 *  function. The invocation method will check what it is
 */
export type T_Method = T_Program | Function;

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** A stackmachine program is an array of opcodes that are read from the
 *  beginning and executed one-after-the-other. Each function is invoked
 *  with the current data and scope stacks, as well as flags object that
 *  can be updated by conditional opcodes
 */
export type T_Program = T_Opcode[];
