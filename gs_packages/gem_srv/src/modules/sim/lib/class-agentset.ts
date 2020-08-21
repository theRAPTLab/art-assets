/* eslint-disable no-continue */
/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  The AgentSet class implements interactions and tests

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { I_Agent, T_Program } from '../types/t-smc';
import { AGENTS } from '../runtime-core';
import { WORLD } from '../agents/global';
import Message from './class-sm-message';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = { pair: true, summary: false };

/// CLASS DEFINITION //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 */
class AgentSet {
  agentTypes: string[]; // 1 or 2 agent types
  testResults: any[]; // array OR array-of-array of T_Agents
  //
  constructor(...types: string[]) {
    this.agentTypes = types;
    if (this.agentTypes.length > 2) throw Error('max 2 type strings');
    if (this.agentTypes.length < 1) throw Error('type string(s) required');
    this.reset();
  }
  reset() {
    this.testResults = [];
  }
  /** utility to retrieve agent sets */
  getAgents(): any[] {
    const len = this.agentTypes.length;
    let retval: any[];
    if (len < 1 || len > 2) throw Error(`bad agent count ${len}`);
    if (len === 1) retval = [[...AGENTS.get(this.agentTypes[0])]];
    if (len === 2) {
      const a = [...AGENTS.get(this.agentTypes[0])];
      const b = [...AGENTS.get(this.agentTypes[1])];
      // the first set is always the smaller one
      retval = a.length > b.length ? [b, a] : [a, b];
    }
    return retval;
  }

  /** uses the test function to filter the agent set into members array */
  filter(test: T_Program): void {
    if (!test) throw Error('undefined filter test');
    const len = this.agentTypes.length;
    if (len !== 1) throw Error('set count must be 1, not 2');
    // always run the first type only
    const [agents] = this.getAgents();
    // push matching agents onto results
    this.testResults = agents.filter(agent => {
      const result = agent.exec_smc(test, []);
      // the result stack should contain 1 element
      if (result.length < 1) throw Error('filter test underflow');
      return result.pop();
    });
  }
  /** Apply test(s) to agents, storing results. A test is a T_Program
   *  that ingests either one or two agents on the stack and returns
   *  either true or false on the stack. The test stack
   */
  pair(test: T_Program): void {
    if (!test) throw Error('undefined pair test');
    const len = this.agentTypes.length;
    if (len < 1 || len > 2) throw Error(`set count != 1 or 2; got ${len}`);
    if (len === 1) this.singlePair(test);
    if (len === 2) this.doublePair(test);
  }

  /** uses the test function to do a pair-wise check on a single agent set
   *  similar to interact(), but does not produce duplicate pairs
   *
   */
  singlePair(test: T_Program): void {
    // always run the first type only
    const [agents] = this.getAgents();
    for (let i = 0; i < agents.length; i++) {
      for (let j = 0; j < i; j++) {
        if (i === j) continue;
        const agentA: I_Agent = agents[i];
        const agentB: I_Agent = agents[j];
        console.log(i, agentA.name(), agentB.name());
        const result = WORLD.exec_smc(test, [agentA, agentB]);
        // the result stack should contain 1 element
        if (result.length < 1) throw Error('pair1 test underflow');
        // save this pair
        if (result.pop() === true) this.testResults.push([agentA, agentB]);
      }
      console.log('---');
    }
  }
  /** uses the test function to run interactions between all agents
   *  these are potentially very slow, so we want to eventually cache
   *  the AgentSet results and streamline the functions as much
   *  as possible
   */
  doublePair(test: T_Program): void {
    // getAgents returns the smaller set first
    const [SET_A, SET_B] = this.getAgents();
    //
    for (let i = 0; i < SET_A.length; i++) {
      for (let j = 0; j < SET_B.length; j++) {
        const agentA: I_Agent = SET_A[i];
        const agentB: I_Agent = SET_B[j];
        // skip agents that match themselves
        if (agentA === agentB) continue;
        const result = WORLD.exec_smc(test, [agentA, agentB]);
        // the result stack should contain 1 element
        if (result.length < 1) throw Error('pair2 test underflow');
        // save this pair
        if (result.pop() === true) this.testResults.push([agentA, agentB]);
      }
    }
    if (DBG.summary) console.log('matching pairs', this.testResults);
  }

  /** returns the members array that has presumably been filtered */
  getMembers(): I_Agent[] {
    return this.testResults as I_Agent[];
  }
  getPairs(): Array<I_Agent[]> {
    return this.testResults as Array<I_Agent[]>;
  }

  /** notify */
  notifyMatches(execs: T_Program[], stacks: any[]): void {
    this.getMembers().forEach(agent => {
      const msg = new Message('exec', {
        programs: execs,
        inputs: stacks.slice(0).concat(agent)
      });
      agent.queue(msg);
    });
    this.reset();
  }
  notifyPairs(execs: T_Program[], stacks: any[]): void {
    if (!Array.isArray(execs)) execs = [execs];
    this.getPairs().forEach(pair => {
      const [agentA, agentB] = pair;
      const msgA = new Message('exec', {
        programs: execs,
        inputs: stacks.slice(0).concat(agentB)
      });
      const msgB = new Message('exec', {
        programs: execs,
        inputs: stacks.slice(0).concat(agentA)
      });
      agentA.queue(msgA);
      agentB.queue(msgB);
    });
    this.reset();
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default AgentSet;