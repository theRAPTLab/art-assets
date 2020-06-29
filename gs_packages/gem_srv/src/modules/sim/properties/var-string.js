/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  The GSString class does simple comparisons

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import GSBoolean from './var-boolean';
import GSVar from './var';

/// CLASS DEFINITION //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class GSString extends GSVar {
  constructor(initial = '') {
    super();
    this.meta.type = Symbol.for('GSString');
    this.value = initial;
  }
  setTo(str) {
    this.value = str;
    return this;
  }
  isEq(str) {
    return new GSBoolean(this.value === str);
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default GSString;
