/* eslint-disable max-classes-per-file */
/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  implementation of keyword "dbgStack" command object

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import React from 'react';
import { Keyword } from 'lib/class-keyword';
import { TOpcode, IScriptUpdate, TScriptUnit } from 'lib/t-script';
import { RegisterKeyword } from 'modules/datacore';

/// CLASS DEFINITION 1 ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export class dbgStack extends Keyword {
  // base properties defined in KeywordDef
  constructor() {
    super('dbgStack');
    this.args = ['numpop:number'];
  }

  /** create smc blueprint code objects */
  compile(unit: TScriptUnit): TOpcode[] {
    const [kw, numpop] = unit;
    const progout = [];

    progout.push((agent, state) => {
      if (agent.aaa === undefined) agent.aaa = 1;
      if (agent.aaa !== 0) {
        --agent.aaa;
        console.groupCollapsed(`agent '${agent.name()}' stack`);
        state.stack.forEach((item, idx) => console.log(idx, item));
        console.groupEnd();
      }
    });
    return progout;
  }

  /** return a state object that turn react state back into source */
  serialize(state: any): TScriptUnit {
    const { error } = state;
    return [this.keyword, error];
  }

  /** return rendered component representation */
  jsx(index: number, unit: TScriptUnit, children?: any[]): any {
    const [kw] = unit;
    return super.jsx(index, unit, <>unknown keyword: {`'${kw}'`}</>);
  }
} // end of UseFeature

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// see above for keyword export
RegisterKeyword(dbgStack);