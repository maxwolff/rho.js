import { ethers } from 'ethers';
import _ from 'lodash';
import * as fs from 'fs';
import * as util from 'util';
import yargs from 'yargs';

import { applyCommand } from './swap';
import { initialState } from './utils';
import {
	Action,
	InitState,
	PaperSwapEntry,
	PaperSwapStorage,
	State,
	StateConfig
} from './types';

// CLI for running swap sim

let writeFile = util.promisify(fs.writeFile);

const scenarioOutputFile = './swapSimFinal.json';
const paperSwapFile = './swapSim.json';
const cusdcAddress = '0x39aa39c021dfbae8fac545936693ac917d5e7563';

// prettier-ignore
const cusdcABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"repayAmount","type":"uint256"}],"name":"repayBorrow","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"reserveFactorMantissa","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"account","type":"address"}],"name":"borrowBalanceCurrent","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"exchangeRateStored","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"borrower","type":"address"},{"name":"repayAmount","type":"uint256"}],"name":"repayBorrowBehalf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"pendingAdmin","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOfUnderlying","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getCash","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newComptroller","type":"address"}],"name":"_setComptroller","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalBorrows","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"comptroller","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"reduceAmount","type":"uint256"}],"name":"_reduceReserves","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"initialExchangeRateMantissa","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"accrualBlockNumber","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"underlying","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"totalBorrowsCurrent","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"redeemAmount","type":"uint256"}],"name":"redeemUnderlying","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalReserves","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"borrowBalanceStored","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"mintAmount","type":"uint256"}],"name":"mint","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"accrueInterest","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"borrowIndex","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"supplyRatePerBlock","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"liquidator","type":"address"},{"name":"borrower","type":"address"},{"name":"seizeTokens","type":"uint256"}],"name":"seize","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newPendingAdmin","type":"address"}],"name":"_setPendingAdmin","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"exchangeRateCurrent","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"getAccountSnapshot","outputs":[{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"borrowAmount","type":"uint256"}],"name":"borrow","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"redeemTokens","type":"uint256"}],"name":"redeem","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"_acceptAdmin","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newInterestRateModel","type":"address"}],"name":"_setInterestRateModel","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"interestRateModel","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"borrower","type":"address"},{"name":"repayAmount","type":"uint256"},{"name":"cTokenCollateral","type":"address"}],"name":"liquidateBorrow","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"admin","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"borrowRatePerBlock","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newReserveFactorMantissa","type":"uint256"}],"name":"_setReserveFactor","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"isCToken","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"underlying_","type":"address"},{"name":"comptroller_","type":"address"},{"name":"interestRateModel_","type":"address"},{"name":"initialExchangeRateMantissa_","type":"uint256"},{"name":"name_","type":"string"},{"name":"symbol_","type":"string"},{"name":"decimals_","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"interestAccumulated","type":"uint256"},{"indexed":false,"name":"borrowIndex","type":"uint256"},{"indexed":false,"name":"totalBorrows","type":"uint256"}],"name":"AccrueInterest","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"minter","type":"address"},{"indexed":false,"name":"mintAmount","type":"uint256"},{"indexed":false,"name":"mintTokens","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"redeemer","type":"address"},{"indexed":false,"name":"redeemAmount","type":"uint256"},{"indexed":false,"name":"redeemTokens","type":"uint256"}],"name":"Redeem","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"borrower","type":"address"},{"indexed":false,"name":"borrowAmount","type":"uint256"},{"indexed":false,"name":"accountBorrows","type":"uint256"},{"indexed":false,"name":"totalBorrows","type":"uint256"}],"name":"Borrow","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"payer","type":"address"},{"indexed":false,"name":"borrower","type":"address"},{"indexed":false,"name":"repayAmount","type":"uint256"},{"indexed":false,"name":"accountBorrows","type":"uint256"},{"indexed":false,"name":"totalBorrows","type":"uint256"}],"name":"RepayBorrow","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"liquidator","type":"address"},{"indexed":false,"name":"borrower","type":"address"},{"indexed":false,"name":"repayAmount","type":"uint256"},{"indexed":false,"name":"cTokenCollateral","type":"address"},{"indexed":false,"name":"seizeTokens","type":"uint256"}],"name":"LiquidateBorrow","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"oldPendingAdmin","type":"address"},{"indexed":false,"name":"newPendingAdmin","type":"address"}],"name":"NewPendingAdmin","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"oldAdmin","type":"address"},{"indexed":false,"name":"newAdmin","type":"address"}],"name":"NewAdmin","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"oldComptroller","type":"address"},{"indexed":false,"name":"newComptroller","type":"address"}],"name":"NewComptroller","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"oldInterestRateModel","type":"address"},{"indexed":false,"name":"newInterestRateModel","type":"address"}],"name":"NewMarketInterestRateModel","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"oldReserveFactorMantissa","type":"uint256"},{"indexed":false,"name":"newReserveFactorMantissa","type":"uint256"}],"name":"NewReserveFactor","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"admin","type":"address"},{"indexed":false,"name":"reduceAmount","type":"uint256"},{"indexed":false,"name":"newTotalReserves","type":"uint256"}],"name":"ReservesReduced","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"error","type":"uint256"},{"indexed":false,"name":"info","type":"uint256"},{"indexed":false,"name":"detail","type":"uint256"}],"name":"Failure","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"Approval","type":"event"}];

const mmAddress = 'mm';
const mmPayoutTokenBalance = 400;
const cTokenAddress = cusdcAddress;
const cTokenABI = cusdcABI;
const marketMakeConfig = {
	addLiquidityAmount1: 5,
	receiveFixedAmount: 11000,
	addLiquidityAmount2: 295
};

const cusdcConfig: StateConfig = {
	initPayoutTokenBalance: 100,
	constants: {
		swapDuration: 2,
		daysInYear: 365,

		yOffset: 0.16,
		range: 0.085,
		rateFactorSensitivity: 0.000075,
		slopeFactor: 3, // increase for flatter slope
		feeBase: 0.001,
		feeMultiplier: 0.003,
		minPayoutRate: 0.1,
		maxPayoutRate: 0.25
	}
};

const activeConfig = cusdcConfig;

const getBorrowIndex = async config => {
	let provider = ethers.getDefaultProvider();
	let cTokenContract = new ethers.Contract(
		cTokenAddress,
		cTokenABI,
		provider
	);
	const index = await cTokenContract.borrowIndex();
	// loses some precision, fine for this use case
	return Number(index.toString()) / 10 ** 18;
};

const init = async (argv, config) => {
	console.log(argv);
	console.log('Writing new ', paperSwapFile);
	const init: State = initialState(argv.users, config);
	init.balances.payoutToken[mmAddress] = mmPayoutTokenBalance;
	const initState: InitState = {
		state: init,
		initDateTime: Date.now()
	};
	const storage: PaperSwapStorage = { init: initState, entries: [] };
	console.log(storage);
	const result = JSON.stringify(storage);
	await writeFile(paperSwapFile, result, 'utf-8');
};

const marketMake = async config => {
	const data = await util.promisify(fs.readFile)(paperSwapFile, 'utf8');
	const storage: PaperSwapStorage = JSON.parse(data);
	await apply(
		{
			from: mmAddress,
			type: 'addLiquidity',
			amount: marketMakeConfig.addLiquidityAmount1
		},
		config
	);
	await apply(
		{
			from: mmAddress,
			type: 'openReceiveFixedSwap',
			amount: marketMakeConfig.receiveFixedAmount
		},
		config
	);
	await apply(
		{
			from: mmAddress,
			type: 'addLiquidity',
			amount: marketMakeConfig.addLiquidityAmount2
		},
		config
	);
};

const read = async config => {
	await apply({ type: 'read' }, config);
};

const apply = async (argv, config) => {
	const data = await util.promisify(fs.readFile)(paperSwapFile, 'utf8');
	const storage: PaperSwapStorage = JSON.parse(data);
	const secondsInDay = 1000 * 60 * 60 * 24;
	const daysSinceInit =
		(Date.now() - storage.init.initDateTime) / secondsInDay;
	const numSwaps = storage.entries.length;
	const prevState: State =
		numSwaps == 0
			? storage.init.state
			: storage.entries[numSwaps - 1].state;

	const borrowIndex = await getBorrowIndex(config);
	const action: Action = {
		feeMultiplier: argv.feeMultiplier,
		feeBase: argv.feeBase,
		from: argv.from,
		type: argv.type,
		amount: argv.amount,
		orderNumber: argv.orderNumber,
		time: daysSinceInit,
		floatIndex: borrowIndex,
		check: argv.check
	};
	console.log('Applying ', action);

	try {
		const newState = applyCommand(prevState, action);
		console.log(util.inspect(newState, false, null, true));
		if (action.type !== 'read') {
			storage.entries.push({ action: action, state: newState });
			const str = JSON.stringify(storage);
			await writeFile(paperSwapFile, str, 'utf-8');
		}
	} catch (err) {
		throw err;
	}
};

// yarn cli init --users max bob jared
// yarn cli mm --from max
// yarn cli apply --type openPayFixedSwap --amount 300 --from bob
// yarn cli read

const argv = yargs
	.command('init', 'creates a new file', yargs => {
		yargs.option('u', {
			alias: 'users',
			demandOption: true,
			describe: 'initializes balances for an array of users',
			type: 'array'
		});
		init(yargs.argv, activeConfig);
	})
	.command('mm', 'marketMake', yargs => {
		marketMake(activeConfig);
	})
	.command('apply', 'apply action to state', yargs => {
		yargs.options({
			t: {
				alias: 'type',
				demandOption: true,
				describe: 'type of action to apply, eg: addLiquidity',
				type: 'string'
			},
			amount: {
				alias: 'amount',
				// demandOption: true,
				type: 'number',
				describe: 'param for the action'
			},
			order: {
				alias: 'orderNumber',
				type: 'number',
				describe: 'order number of swap to close'
			},
			f: {
				alias: 'from',
				default: false,
				describe: 'sender of the tx',
				type: 'string'
			},
			feeBase: {
				alias: 'feeBase',
				type: 'number'
			},
			feeMultiplier: {
				alias: 'feeMultiplier',
				type: 'number'
			},
			check: {
				alias: 'check',
				demandOption: true,
				describe: 'sender of the tx',
				type: 'boolean'
			}
		});
		// console.log(yargs.argv);
		apply(yargs.argv, activeConfig);
	})
	.command('close', 'closes most recent swap', yargs => {
		apply({ type: 'closeSwap', orderNumber: 0, from: 'mm' }, activeConfig);
	})
	.command('read', 'prints state and interest rates, no changes', yargs => {
		read(activeConfig);
	}).argv;
