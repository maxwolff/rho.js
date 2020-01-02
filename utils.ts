import {
	Action,
	Constants,
	InputAction,
	LiquidityAccounts,
	ProtocolState,
	State
} from './types';

// stuff that doesnt belong anywhere else

export const initialState = (users: string[], config): State => {
	const payoutTokenBalances: {
		[key: string]: number;
	} = users.reduce(
		(balances, curr: string) => {
			balances[curr] = config.initPayoutTokenBalance;
			return balances;
		},
		{ protocol: 0 }
	);

	return {
		protocol: {
			activeCollateral: 0,
			totalLiquidity: 0,
			supplyIndex: 1,

			notionalReceivingFloat: 0,
			notionalPayingFloat: 0,

			notionalDaysReceivingFloat: 0,
			notionalDaysPayingFloat: 0,

			notionalPayingFixed: 0,
			notionalReceivingFixed: 0,

			avgFixedRatePaying: 0,
			avgFixedRateReceiving: 0,

			fixedToPay: 0,
			fixedToReceive: 0,

			rateFactor: 0,
			swaps: [],
			time: 0,
			lastFloatIndex: 1,
			liquidityAccounts: {}
		},
		balances: {
			payoutToken: payoutTokenBalances
		},
		constants: config.constants
	};
};

export const calculateFloatIndices = (
	actions: InputAction[],
	daysInYear: number
): Action[] => {
	return actions.reduce((acc: Action[], curr: Action, index: number, src) => {
		const accruedDays = index == 0 ? 0 : curr.time - src[index - 1].time;
		const accruedYears = accruedDays / daysInYear;
		const prevIndex = index == 0 ? 1 : acc[index - 1].floatIndex;
		const newFloatIndex = prevIndex * (1 + curr.floatRate * accruedYears);
		const action = { ...curr, floatIndex: newFloatIndex };
		delete action.floatRate;
		acc.push(action);
		return acc;
	}, []);
};

// just a util for paper swaps, not part of the protocol.

export const printNumbers = (protocol: ProtocolState, constants: Constants) => {
	// just for paper swaps, not part of the protocol (would be off-chain)
	// const payFixed = getRate(SwapType.payFixed, 0, protocol, constants);
	// const receiveFixed = getRate(SwapType.receiveFixed, 0, protocol, constants);
	console.log(
		// '\n payFixed starting at:',
		// (100 * payFixed).toPrecision(4),
		// '% receiveFixed starting at: ',
		// (100 * receiveFixed).toPrecision(4),
		'%, total liquidity:',
		protocol.totalLiquidity.toPrecision(4),
		', utilization:',
		(
			(100 * protocol.activeCollateral) /
			protocol.totalLiquidity
		).toPrecision(4),
		'% protocol paying average of: ',
		(100 * protocol.avgFixedRatePaying).toPrecision(4),
		'% protocol receiving average of: ',
		(100 * protocol.avgFixedRateReceiving).toPrecision(4)
	);
};

export const teamString = [
	'lebron',
	'anthony',
	'danny',
	'kentavious',
	'avery',
	'javale',
	'quinn',
	'alex',
	'rajon',
	'calvin',
	'dwight'
];
