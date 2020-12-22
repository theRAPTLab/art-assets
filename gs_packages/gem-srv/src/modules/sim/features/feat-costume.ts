/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  The Costume Class!

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import { NumberProp, StringProp } from 'modules/sim/props/var';
import Feature from 'lib/class-feature';
import { IAgent } from 'lib/t-script';
import { Register } from 'modules/datacore/dc-features';
import { GetTextureInfo } from 'modules/datacore/dc-globals';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PR = UR.PrefixUtil('FeatMovement');
const DBG = false;
let COUNTER = 0;

/// FEATURE CLASS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class CostumePack extends Feature {
  //
  constructor(name) {
    super(name);
    // add feature methods here
    this.featAddMethod('setCostume', this.setCostume);
    this.featAddMethod('setPose', this.setPose);
    this.featAddMethod('test', this.test);
    this.featAddMethod('thinkHook', agent => {
      const prop = agent.prop.Costume.counter;
      prop.add(1);
      if (prop.value === 0) console.log(`${agent.name} is CostumeThinking`);
    });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** This runs once to initialize the feature for all agents */
  initialize(simloop) {
    super.initialize(simloop);
    simloop.hook('INPUT', frame => console.log(frame));
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Add costume-specific properties to the agent. The feature methods
   *  are defined inside the featurepack instance, not the agent instance
   *  as props are.
   */
  decorate(agent) {
    super.decorate(agent);
    // add feature props here
    let prop = new NumberProp(0);
    // initialize a counter in the agent
    // it will be checked during 'thinkHook' when it's invoked via a
    // featureHook keyword
    prop.setMax(120);
    prop.setMin(0);
    prop.setWrap();
    this.featAddProp(agent, 'counter', prop); // used by thinkhook example above
    this.featAddProp(agent, 'costumeName', new StringProp('default'));
    prop = new NumberProp(0);
    prop.setWrap();
    prop.setMin(0);
    prop.setMax(0);
    this.featAddProp(agent, 'currentFrame', prop);
  }

  /// COSTUME METHODS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Invoked through featureCall script command. To invoke via script:
   *  featureCall Costume setCostume value
   */
  setCostume(agent: IAgent, costumeName: string, poseName: string | Number) {
    agent.featProp(this.name, 'costumeName').value = costumeName;
    const { frameCount } = GetTextureInfo(costumeName);
    if (poseName !== undefined) {
      const cf = agent.featProp(this.name, 'currentFrame') as NumberProp;
      cf.value = poseName;
      cf.setMax(frameCount - 1);
    }
  }
  setPose(agent: IAgent, poseName: string | number) {
    agent.featProp(this.name, 'currentFrame').value = poseName;
  }
  test(agent: IAgent) {
    console.log('GOT AGENT', agent.name, 'from FEATURE', this.name);
  }
}

/// REGISTER SINGLETON ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const INSTANCE = new CostumePack('Costume');
Register(INSTANCE);