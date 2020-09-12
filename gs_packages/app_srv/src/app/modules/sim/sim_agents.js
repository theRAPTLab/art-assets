/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  AGENT CONCEPTUAL TEST CODE

  WORKING EXPRESSIONS

  * setting/getting properties inside an agent context
  * possibly setting/getting properties from a global context
  * writing a method as a function (agent, param)
    ..that manipulates properties and participates in the lifecycle (features)
  * writing a condition as a function that returns truthy/falsey valies
    - writing a condition as a function that returns a ValueRange
      with truthy/falsey interpretation
    - defining types with built-in conditional checks
    - chained conditions
  * accesssing a collection of agents
  * filtering a collection of agents using a condition
  * executing a method conditionally

  NEXT EXPRESSIONS

  what is an event / trigger / observable / pipe
  how do conditions relate to events and triggers

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import UR from '@gemstep/ursys/client';
import AgentFactory from './agents/agentfactory';
import { StackMachine } from './script/stackmachine';

// import UR from '@gemstep/ursys/client';
const PR = UR.PrefixUtil('SIM_AGENTS');

/// PROGRAMMING INTERFACE /////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AgentSelect() {
  console.groupEnd();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AgentProgram() {
  /*/ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \*\
    define agent MyAgent
      .name setTo "Bob the Agent"
      .x setTo 100
      .y setTo 200
      .skin setTo "balloon.png"
      define property .currentHealth as Number
        setTo 0
        max 10
        min 0
    use feature Movement
      setController "student"
    use feature Costume
      setCostumes {1:"slowbee.png", 2:"fastbee.png"}
      showCostume 1
  \*\ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - /*/
  console.groupCollapsed('Flower Programming');
  AgentFactory.AddTemplate('Flower', agent => {
    // all this is direct templating
    agent.prop('x').setTo(100);
    agent.prop('y').setTo(200);
    agent.prop('skin').setTo('flower.png');
    // agent
    //   .addProp('currentHealth', new NumberProp(100))
    //   .setMin(0)
    //   .setMax(100);
    // agent.addProp('isAlive', new BooleanProp(true));
    // agent.addFeature('Movement').setController('student');
    // this stuff has to create smcode runtime programs
  });
  console.groupEnd();
  /*/ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \*\
    creation test
  \*\ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - /*/
  console.groupCollapsed('Creation Testing');

  const names = [];
  for (let i = 0; i < 100; i++) names.push(`flower${i}`);
  const smc_init = StackMachine.test_smc_init;
  names.forEach(name => {
    const agent = AgentFactory.MakeAgent(name, { type: 'Flower' });
    StackMachine.ExecSMC(smc_init, agent);
  });
  console.log('Flowers', AgentFactory.GetAgentsByType('Flower'));
  console.log('Mugworts', AgentFactory.GetAgentsByType('Mugworts'));
  console.groupEnd();

  /*/ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \*\
    when MyTimer.elapsed greaterThan 10
      @MyTimer reset
      World.pollution add 1
  \*\ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - /*/
  console.groupCollapsed('World Programming');
  AgentFactory.AddTemplate('World', world => {
    world.addFeature('Timer');
  });
  // save creation template
  console.groupEnd();

  /*/ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \*\
    condition programming
  \*\ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - /*/
  console.groupCollapsed('OnTick Testing');
  const ticker = AgentFactory.MakeAgent('TickyTicky');
  ticker.addFeature('Timer');
  console.groupEnd();
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AgentUpdate(/* frame */) {
  // const healthProp = agent.prop('currentHealth');
  // console.log(healthProp.value, healthProp.nvalue);
  // if (healthProp.eq(5).true()) console.log('!!! 5 health');
  // healthProp.add(1);
  const agents = AgentFactory.GetAgentsByType('Flower');
  // test generic smc program
  // const smc_update = StackMachine.test_smc_update;
  // agents.forEach(agent => StackMachine.ExecSMC(smc_update, agent));
  // test agent queued exec
  agents.forEach(agent => agent.AGENTS_EXEC());
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AgentThink(/* frame */) {}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AgentExec(/* frame */) {
  //
  const smc_condition = StackMachine.test_smc_condition;
  StackMachine.ExecSMC(smc_condition, AgentFactory.GetWorldAgent());
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AgentReset(/* frame */) {
  console.log('AgentReset');
}

/// PHASE MACHINE INTERFACE ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
UR.SystemHook('SIM', 'RESET', AgentReset);
UR.SystemHook('SIM', 'SETMODE', AgentSelect);
UR.SystemHook('SIM', 'PROGRAM', AgentProgram);
UR.SystemHook('SIM', 'AGENTS_UPDATE', AgentUpdate);
UR.SystemHook('SIM', 'AGENTS_THINK', AgentThink);
UR.SystemHook('SIM', 'AGENTS_EXEC', AgentExec);

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default {
  AgentSelect,
  AgentProgram,
  AgentFactory
};
