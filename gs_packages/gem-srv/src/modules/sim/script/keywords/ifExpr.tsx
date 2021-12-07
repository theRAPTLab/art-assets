/* eslint-disable max-classes-per-file */
/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  implementation of keyword "ifExpr" command object

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import React from 'react';
import Keyword from 'lib/class-keyword';
import { TOpcode, TScriptUnit } from 'lib/t-script';
import { RegisterKeyword, UtilFirstValue } from 'modules/datacore';
import { ScriptToJSX } from 'modules/sim/script/tools/script-to-jsx';

/// CLASS DEFINITION //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export class ifExpr extends Keyword {
  // base properties defined in KeywordDef
  constructor() {
    super('ifExpr');
    this.args = ['test:TMethod', 'consequent:TMethod', 'alternate:TMethod'];
  }

  /** create smc blueprint code objects
   *  NOTE: when compile is called, all arguments have already been expanded
   *  from {{ }} to a ParseTree
   */
  compile(unit: TScriptUnit): TOpcode[] {
    const [kw, test, consq, alter] = unit;
    const code = [];
    code.push((agent, state) => {
      const vals = agent.exec(test, state.ctx);
      const result = UtilFirstValue(vals);
      if (result && consq) agent.exec(consq, state.ctx);
      if (!result && alter) agent.exec(alter, state.ctx);
    });
    return code;
  }

  /** return rendered component representation */
  jsx(index: number, unit: TScriptUnit, options: any, children?: any): any {
    const [keyword, testName, consequent, alternate] = unit;
    return <>{keyword}</>;
  }
} // end of keyword definition

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// see above for keyword export
RegisterKeyword(ifExpr);
