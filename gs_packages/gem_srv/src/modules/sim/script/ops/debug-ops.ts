/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Debugging Stack Machine Operations
  see basic-ops.ts for description of stack machine

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { T_Agent, T_State, T_Opcode, T_OpWait } from '../../types/t-smc';

/// DEBUG OPCODES /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// support util functions ////////////////////////////////////////////////////
function u_dump(num: number = 0, stack: any[], prompt: string = '<dump>') {
  if (num === 0 || num > stack.length) {
    console.log(`${prompt}:`, stack);
    return;
  }
  const end = stack.length - 1;
  const arr = [];
  for (let i = num; i--; i > 0) arr.push(stack[end - i]);
  console.log(`${prompt}-top ${num}:`, arr);
}
/** Dump the current stack contents to console. Defaults to all.
 *  Optionally dump number of items to dump
 */
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const dbgStack = (num: number = 0, desc: string = 'stack'): T_Opcode => {
  return (agent: T_Agent, STATE: T_State): T_OpWait => {
    const { stack } = STATE;
    u_dump(num, stack, desc);
  };
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const dbgStackCount = (num: number, desc: string = 'dbgStackCount') => {
  return (agent: T_Agent, STATE: T_State): T_OpWait => {
    const slen = STATE.stack.length;
    if (slen !== num) throw Error(`stack.length ${slen}!==${num} (${desc})`);
  };
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Dump the current scope contents to console. Defaults to all.
 *  Optionally dump number of items to dump
 */
const dbgScope = (num: number = 0): T_Opcode => {
  return (agent: T_Agent, STATE: T_State): T_OpWait => {
    const { scope } = STATE;
    u_dump(num, scope, 'scope');
  };
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const dbgAgent = (match?: string): T_Opcode => {
  return (agent: T_Agent): T_OpWait => {
    if ((match && agent.name() === match) || !match)
      console.log(`agent[${agent.name()}] serialize:`, agent.serialize());
  };
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** implement a pause */
const dbgOut = (...args: any): T_Opcode => {
  return (): T_OpWait => {
    console.log(...args);
  };
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** implement a pause */
const nop = (): T_Opcode => {
  return (): T_OpWait => {};
};

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// debug opcodes
export { dbgStack, dbgScope, dbgAgent, dbgOut, nop, dbgStackCount };
