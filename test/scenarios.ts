import { ActionType, Scenario } from '../types';

// scenarios for tests

// test final state of sim
export const simScenario = {
	protocol: {
		activeCollateral: 0,
		totalLiquidity: 0,
		fixedToPay: 0,
		fixedToReceive: 0,
		supplyIndex: 1.0837
	},
	balances: {
		payoutToken: {
			protocol: 0
		}
	}
};

// build your own scenario
export const testScenarios: Scenario[] = [
	{
		name: 'basic active swaps',
		actions: [
			{
				from: 'Tiberius',
				type: ActionType.addLiquidity,
				amount: 100,
				time: 0,
				floatRate: 0
			},
			{
				from: 'Kemi',
				type: ActionType.openPayFixedSwap,
				amount: 1000,
				time: 0,
				floatRate: 0
			},
			{
				from: 'Mariana',
				type: ActionType.openReceiveFixedSwap,
				amount: 1500,
				time: 30,
				floatRate: 0.12
			}
		],
		expect: {
			protocol: {
				activeCollateral: 12.4913,
				totalLiquidity: 103.7543,
				supplyIndex: 1.0375,

				notionalPayingFixed: 1500,
				notionalReceivingFixed: 1000,

				notionalDaysReceivingFloat: 135000,
				notionalDaysPayingFloat: 60000,

				avgFixedRatePaying: 0.15678,
				avgFixedRateReceiving: 0.16505,

				fixedToPay: 58.8116,
				fixedToReceive: 27.5087,

				rateFactor: -0.0301,
				swaps: [
					{
						type: 'payFixed',
						notional: 1000,
						initTime: 0,
						swapRate: 0.1650524118326424,
						owner: 'Kemi',
						initIndex: 1,
						userCollateral: 21.2631
					},
					{
						type: 'receiveFixed',
						notional: 1500,
						initTime: 30,
						swapRate: 0.1567827338741547,
						owner: 'Mariana',
						initIndex: 1.01,
						userCollateral: 31.1884
					}
				],
				time: 30,
				lastFloatIndex: 1.01
			}
		}
	},
	{
		name: 'add liquidity during late swap',
		actions: [
			{
				from: 'Tiberius',
				type: ActionType.addLiquidity,
				amount: 100,
				time: 0,
				floatRate: 0
			},
			{
				from: 'Kemi',
				type: ActionType.openPayFixedSwap,
				amount: 1000,
				time: 0,
				floatRate: 0.1
			},
			{
				from: 'Mariana',
				type: ActionType.addLiquidity,
				amount: 100,
				time: 45,
				floatRate: 0.1
			},
			{
				from: 'Kemi',
				type: ActionType.closeSwap,
				orderNumber: 0,
				time: 120,
				floatRate: 0.1
			},
			{
				from: 'Mariana',
				type: ActionType.removeLiquidity,
				amount: -1,
				time: 120,
				floatRate: 0.1
			},
			{
				from: 'Tiberius',
				type: ActionType.removeLiquidity,
				amount: -1,
				time: 120,
				floatRate: 0.11
			}
		],
		expect: {
			protocol: {
				totalLiquidity: 0,
				activeCollateral: 0,
				fixedToReceive: 0
			},
			balances: {
				payoutToken: { protocol: 0 }
			}
		}
	},
	{
		name: 'spreadsheet scenario',
		actions: [
			{
				from: 'Tiberius',
				type: ActionType.addLiquidity,
				amount: 100,
				time: 0,
				floatRate: 0
			},
			{
				from: 'Kemi',
				type: ActionType.openPayFixedSwap,
				amount: 1000,
				time: 0,
				floatRate: 0
			},
			{
				from: 'Mariana',
				type: ActionType.openReceiveFixedSwap,
				amount: 1500,
				time: 30,
				floatRate: 0.12
			},
			{
				from: 'Felicia',
				type: ActionType.openPayFixedSwap,
				amount: 1000,
				time: 60,
				floatRate: 0.14
			},
			{
				from: 'Darrell',
				type: ActionType.openReceiveFixedSwap,
				amount: 750,
				time: 70,
				floatRate: 0.11
			},
			{
				from: 'Kemi',
				type: ActionType.closeSwap,
				orderNumber: 0,
				time: 90,
				floatRate: 0.105
			},
			{
				from: 'Mariana',
				type: ActionType.closeSwap,
				orderNumber: 0,
				time: 120,
				floatRate: 0.12
			}
		],
		expect: {
			protocol: {
				activeCollateral: 12.7745,
				totalLiquidity: 101.7552,
				supplyIndex: 1.0176,

				notionalReceivingFloat: 761.9188,
				notionalPayingFloat: 1018.9958,

				notionalPayingFixed: 750,
				notionalReceivingFixed: 1000,

				fixedToPay: 13.0948,
				fixedToReceive: 13.6536
			}
		}
	},
	{
		name: 'huge swap, upper rate bound, no revert',
		actions: [
			{
				from: 'Tiberius',
				type: ActionType.addLiquidity,
				amount: 1,
				time: 0,
				floatRate: 0
			},
			{
				from: 'Kemi',
				type: ActionType.openPayFixedSwap,
				amount: 1000,
				time: 0,
				floatRate: 0
			}
		],
		expect: {
			protocol: {
				activeCollateral: 0
			}
		}
	},
	{
		name: 'withdraw too much liquidity error',
		actions: [
			{
				from: 'Tiberius',
				type: ActionType.addLiquidity,
				amount: 100,
				time: 0,
				floatRate: 0
			},
			{
				from: 'Kemi',
				type: ActionType.openPayFixedSwap,
				amount: 1000,
				time: 0,
				floatRate: 0
			},
			{
				from: 'Tiberius',
				type: ActionType.removeLiquidity,
				amount: 81.264,
				time: 0,
				floatRate: 0
			}
		],
		expect: {
			err:
				'Protocol does not have enough liquidity to satisfy this request'
		}
	},
	{
		name: 'withdraw max, no error',
		actions: [
			{
				from: 'Tiberius',
				type: ActionType.addLiquidity,
				amount: 100,
				time: 0,
				floatRate: 0
			},
			{
				from: 'Kemi',
				type: ActionType.openPayFixedSwap,
				amount: 1000,
				time: 0,
				floatRate: 0
			},
			{
				from: 'Tiberius',
				type: ActionType.removeLiquidity,
				amount: 81.263,
				time: 0,
				floatRate: 0
			}
		],
		expect: {}
	}
];
