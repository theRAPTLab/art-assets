/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  implementation of keyword _onCondition command object

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import React from 'react';
import { Keyword } from 'lib/class-keyword';
import { IAgent, IScopeable, IState } from 'lib/t-script';
import { ISMCBundle, IScriptUpdate, TScriptUnit } from 'lib/t-script';
import { RegisterKeyword, GetTest } from 'modules/runtime-datacore';

/// CLASS HELPERS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_Random(min: number, max: number, floor: boolean = true) {
  const n = Math.random() * (max - min) + min;
  if (floor) return Math.floor(n);
  return n;
}

/// CLASS DEFINITION //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export class OnCondition extends Keyword {
  // base properties defined in KeywordDef

  constructor() {
    super('onCondition');
    this.args = ['testName:string', 'consequent:smc', 'alternate:smc'];
  }

  /** create smc blueprint code objects */
  compile(parms: any[]): ISMCBundle {
    const testName = parms[0];
    const consq = parms[1];
    const alter = parms[2];
    const test = GetTest(testName);
    const progout = [];
    progout.push((agent: IAgent, state: IState) => {
      const pass = agent.exec(test); // a test always returns boolean
      if (pass) agent.exec(consq);
      if (!pass) agent.exec(alter);
    });
    return {
      define: [],
      defaults: [],
      conditions: progout
    };
  }

  /** return a state object that turn react state back into source */
  serialize(state: any): TScriptUnit {
    const { min, max, floor } = state;
    return [this.keyword, min, max, floor];
  }

  /** return rendered component representation */
  render(index: number, args: any[], children?: any[]): any {
    const testName = args[1];
    const conseq = args[2];
    const alter = args[3];
    return (
      <div key={this.generateKey()} className="onCondition">
        on {testName} TRUE {conseq}, ELSE {alter}
      </div>
    );
  }
} // end of UseFeature

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// see above for keyword export
RegisterKeyword(OnCondition);
