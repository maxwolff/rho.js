import chai from 'chai';
import chaiAlmost from 'chai-almost';
import _ from 'lodash';
import * as fs from 'fs';
import util from 'util';

import { testScenarios, simScenario } from './scenarios';
import { applyCommand } from '../protocol';
import {
	Action,
	InputAction,
	PaperSwapStorage,
	PaperSwapEntry,
	Scenario,
	State,
	StateConfig
} from '../types';
import { calculateFloatIndices, initialState, teamString } from '../utils';

// Runs tests on swap.ts. Runs scenarios from scenariost.ts, and actions and final states from swap week

chai.use(chaiAlmost(0.0001));
const expect = chai.expect;
let writeFile = util.promisify(fs.writeFile);

const actionFile = 'data/swapSimActions.json';
// const testResultFile = 'simTestResults.json';

const config: StateConfig = {
	initPayoutTokenBalance: 100,
	constants: {
		swapDuration: 90,
		daysInYear: 360,

		yOffset: 0.16,
		range: 0.085,
		rateFactorSensitivity: 0.000075,
		feeBase: 0.001,
		feeMultiplier: 0.003,
		slopeFactor: 2,

		minPayoutRate: 0.08,
		maxPayoutRate: 0.24
	}
};

describe('Scenario Tests', () => {
	testScenarios.forEach((scenario: Scenario) => {
		// console.log(
		// 	'\x1b[36m%s\x1b[0m', // print blue color
		// 	`\n RUNNING SCENARIO ${scenario.name} \n`
		// );
		const actions: Action[] = calculateFloatIndices(
			scenario.actions,
			config.constants.daysInYear
		);
		const users: string[] = actions.reduce(
			(usernameArr: string[], curr) => {
				usernameArr.push(curr.from);
				return usernameArr;
			},
			[]
		);
		describe(`Test ${scenario.name}`, () => {
			try {
				const result: State = actions.reduce(
					(state: any, action: Action) => {
						// console.log(
						// 	util.inspect(state.protocol, false, null, true)
						// );
						// console.log(
						// 	util.inspect(state.balances, false, null, true)
						// );
						// console.log(
						// 	`\n --- Applying ${action.type} for ${action.amount} from ${action.from} at time ${action.time} \n`
						// );
						// console.log(action);
						return applyCommand(state, action);
					},
					initialState(users, config)
				);
				// console.log(util.inspect(result, false, null, true));
				// console.log('\x1b[4m', '\n SHOULD EQUAL \n');
				// console.log(
				// 	'\n',
				// 	util.inspect(scenario.expect, false, null, true)
				// );
				const protocolKeys = _.keys(scenario.expect.protocol);
				protocolKeys.forEach((key: string) => {
					it(`${key}`, () => {
						if (key === 'swaps') {
							result.protocol.swaps.map(
								(swap: {}, index: number) => {
									_.keys(swap).map((swapKey: string) => {
										expect(
											result.protocol.swaps[index][
												swapKey
											]
										).to.almost.equal(
											scenario.expect.protocol.swaps[
												index
											][swapKey]
										);
									});
								}
							);
						} else {
							expect(result.protocol[key]).to.almost.equal(
								scenario.expect.protocol[key]
							);
						}
					});
				});
			} catch (err) {
				if (!_.isUndefined(scenario.expect.err)) {
					it('expect error', () => {
						expect(err.toString()).to.have.string(
							scenario.expect.err
						);
					});
				}
			}
		});
	});
});

describe('Swap Week Test', async () => {
	let finalState: PaperSwapEntry;
	let simStates: PaperSwapStorage;
	before('run swap week actions', async () => {
		const rawActionFile = await util.promisify(fs.readFile)(
			actionFile,
			'utf8'
		);
		const actionJson = JSON.parse(rawActionFile);
		let initState: State = initialState(teamString, {
			initPayoutTokenBalance: 100,
			constants: actionJson.init.state.constants
		});
		initState.balances.payoutToken['mm'] = 400;
		initState.constants.maxPayoutRate = 0.2;
		initState.constants.minPayoutRate = 0.12;

		const actions: Action[] = actionJson.actions;
		const initStorage: PaperSwapStorage = {
			init: { initDateTime: 0, state: initState },
			entries: []
		};
		simStates = actions.reduce(
			(newStorage: PaperSwapStorage, action: Action, index: number) => {
				const lastState: State =
					index == 0
						? newStorage.init.state
						: _.last(newStorage.entries).state;
				const newState = applyCommand(lastState, action);
				newStorage.entries.push({
					state: newState,
					action: action
				});
				return newStorage;
			},
			initStorage
		);
		// print all intermediate states?
		// console.log(util.inspect(_.last(result.entries), false, null, true));
		finalState = _.last(simStates.entries);
	});

	describe('test actions', () => {
		it('Protocol balance is 0', () => {
			expect(
				finalState.state.balances.payoutToken.protocol
			).to.almost.equal(0);
		});
		it('long profit is correct', () => {
			expect(finalState.state.balances.payoutToken.kentavious).to.almost.equal(
				143.2645
			);
		});

		it('short profit is correct', () => {
			expect(finalState.state.balances.payoutToken.rajon).to.almost.equal(
				76.8573
			);
		});
		_.keys(simScenario.protocol).forEach((key: string) => {
			it(`${key}`, () => {
				expect(finalState.state.protocol[key]).to.almost.equal(
					simScenario.protocol[key]
				);
			});
		});
	});

	// after('write all states to file', async () => {
	// 	try {
	// 		await writeFile(testResultFile, JSON.stringify(simStates), 'utf-8');
	// 	} catch (err) {
	// 		console.log(err);
	// 	}
	// });
});
