import assert from 'assert';
import _ from 'lodash';

import {
	Action,
	ActionType,
	Balances,
	Constants,
	ProtocolState,
	State,
	Swap,
	SwapType
} from './types';
import { printNumbers } from './utils';

// Implements the rho protocol

// for asserts
const precision = 0.0000001;

// The fee for liquidity providers is based on the utilization percentage.
const getFee = (
	activeCollateral: number,
	totalLiquidity: number,
	constants: Constants
): number => {
	const util =
		totalLiquidity == 0
			? 0
			: Math.max(activeCollateral / totalLiquidity, 0);
	return constants.feeBase + constants.feeMultiplier * util;
};

// Gets the interest rate for new swaps.
// The rate factor is an arbitrary floating variable that is the input to a curve which yields us the rate.
// If rate factor is X, then: X(new) = X(old) + rateFactorSensitivity * orderNotional / totalLiquidity
// The curve is rate = range * rateFactor / sqrt(rateFactor^2 + slopeFactor) + yOffset
// https://observablehq.com/d/8a889476c0bddfff
const getRate = (
	type: SwapType,
	orderNotional: number,
	protocol: ProtocolState,
	constants: Constants
): number => {
	let fee = getFee(
		protocol.activeCollateral,
		protocol.totalLiquidity,
		constants
	);
	const orderWeight =
		constants.rateFactorSensitivity * constants.swapDuration;
	const rateFactorDelta =
		(orderNotional * orderWeight) / protocol.totalLiquidity;
	if (type === SwapType.payFixed) {
		protocol.rateFactor += rateFactorDelta;
	} else if (type === SwapType.receiveFixed) {
		protocol.rateFactor -= rateFactorDelta;
		fee = -fee;
	}
	return (
		(constants.range * protocol.rateFactor) /
			Math.sqrt(
				Math.pow(protocol.rateFactor, 2) + constants.slopeFactor
			) +
		constants.yOffset +
		fee
	);
};

// Called whenever time passes. Accounts for payments to swappers (even though profit / loss is only realized upon closing a swap)
const accrueProtocolCashflow = (
	constants: Constants,
	protocol: ProtocolState,
	accruedDays: number,
	newFloatIndex: number
) => {
	const fixedReceived =
		(protocol.avgFixedRateReceiving *
			protocol.notionalReceivingFixed *
			accruedDays) /
		constants.daysInYear;

	const fixedPaid =
		(protocol.avgFixedRatePaying *
			protocol.notionalPayingFixed *
			accruedDays) /
		constants.daysInYear;

	const floatPaid =
		protocol.notionalPayingFloat *
		(newFloatIndex / protocol.lastFloatIndex - 1);

	const floatReceived =
		protocol.notionalReceivingFloat *
		(newFloatIndex / protocol.lastFloatIndex - 1);

	const profitAccrued = fixedReceived + floatReceived - fixedPaid - floatPaid;
	const profitRate = profitAccrued / protocol.totalLiquidity;
	protocol.supplyIndex = protocol.supplyIndex * (1 + profitRate);
	protocol.totalLiquidity += profitAccrued;

	protocol.fixedToPay -= fixedPaid;
	protocol.fixedToReceive -= fixedReceived;

	// compound float notionals
	protocol.notionalPayingFloat *= newFloatIndex / protocol.lastFloatIndex;
	protocol.notionalReceivingFloat *= newFloatIndex / protocol.lastFloatIndex;
};

// Called when time passes. Do not call before
const updateProtocolActiveCollateral = (
	constants: Constants,
	protocol: ProtocolState,
	accruedDays: number
) => {
	// notionalDays pool the floating leg of many swaps, helping to calculate worst case future cashflows for floating rates (fixed rates are done via 'fixedToPay' & 'fixedToReceive')
	// eg: a 10 day swap @ 10 notional = 100 notional days we will have to pay float for
	// we do not apply compounding here, so we use the non-compounding notional measure (pay / rec fixed)
	protocol.notionalDaysPayingFloat -=
		protocol.notionalReceivingFixed * accruedDays;
	protocol.notionalDaysReceivingFloat -=
		protocol.notionalPayingFixed * accruedDays;

	const minFloatToReceive =
		(constants.minPayoutRate * protocol.notionalDaysReceivingFloat) /
		constants.daysInYear;
	const maxFloatToPay =
		(constants.maxPayoutRate * protocol.notionalDaysPayingFloat) /
		constants.daysInYear;
	// max payables - min receivable
	protocol.activeCollateral =
		protocol.fixedToPay +
		maxFloatToPay -
		protocol.fixedToReceive -
		minFloatToReceive;
};

// Implements swap functions
export const applyCommand = (state: State, action: Action): State => {
	const protocol: ProtocolState = _.cloneDeep(state.protocol);
	const balances: Balances = _.cloneDeep(state.balances);
	const constants: Constants = _.cloneDeep(state.constants);
	const accruedDays = action.time - protocol.time;
	assert(
		action.from in state.balances.payoutToken ||
			action.type === ActionType.read,
		`{action.type} failed, invalid user`
	);
	assert(
		accruedDays >= 0,
		"Can't pass an action with an earlier time than the previous action"
	);

	if (protocol.totalLiquidity !== 0) {
		accrueProtocolCashflow(
			constants,
			protocol,
			accruedDays,
			action.floatIndex
		);
		// technically does not have to be called for add / remove liq. tx
		updateProtocolActiveCollateral(constants, protocol, accruedDays);
	}
	protocol.time += accruedDays;
	protocol.lastFloatIndex = action.floatIndex;

	switch (action.type) {
		case ActionType.updateFee: {
			constants.feeBase = action.feeBase;
			constants.feeMultiplier = action.feeMultiplier;
			break;
		}

		// not really tested
		case ActionType.updateModel: {
			assert(!_.isUndefined(action.yOffset),'Params missing for rate update');
			constants.yOffset = action.yOffset;

			// The maximum and minimum we ever expect the interest rate to go to
			constants.minPayoutRate = constants.yOffset - constants.range;
			constants.maxPayoutRate = constants.yOffset + constants.range;
			break;
		}

		case ActionType.addLiquidity: {
			const account = protocol.liquidityAccounts[action.from];
			// accrue supply profits for the user's existing deposits.
			const accruedAmount = !_.isUndefined(account)
				? (account.amount * protocol.supplyIndex) /
				  account.depositSupplyIndex
				: 0;
			// newAccountLiquidity = new deposits + existing deposits & profits
			const newAccountLiquidity = action.amount + accruedAmount;

			protocol.liquidityAccounts[action.from] = {
				amount: newAccountLiquidity,
				lastDepositTime: protocol.time,
				depositSupplyIndex: protocol.supplyIndex
			};
			protocol.totalLiquidity += action.amount;
			balances.payoutToken[action.from] -= action.amount;
			balances.payoutToken.protocol += action.amount;
			break;
		}

		case ActionType.removeLiquidity: {
			const account = protocol.liquidityAccounts[action.from];

			// decrement existing liquidity deposits if not a full withdraw
			const accountLiquidity =
				(account.amount * protocol.supplyIndex) /
				account.depositSupplyIndex;

			const withdrawAmount =
				action.amount == -1 ? accountLiquidity : action.amount;

			if (action.amount == -1) {
				delete protocol.liquidityAccounts[action.from];
			} else {
				const newAccountLiquidity = accountLiquidity - withdrawAmount;
				protocol.liquidityAccounts[action.from] = {
					amount: newAccountLiquidity,
					lastDepositTime: protocol.time,
					depositSupplyIndex: protocol.supplyIndex
				};
			}

			// Prevents users from supplying liquidity right before they swap to minimize their price slippage
			// TODO: implement this
			// assert(
			// 	account.lastDepositTime + constants.minDepositTime >
			// 		protocol.time,
			// 	'Need to wait min deposit time before withdrawing liquidity'
			// );

			assert(
				protocol.totalLiquidity + precision > withdrawAmount,
				'Protocol does not have enough liquidity to satisfy this request'
			);

			assert(
				protocol.totalLiquidity - withdrawAmount + precision >
					protocol.activeCollateral,
				'Protocol does not have enough liquidity to satisfy this request'
			);

			protocol.totalLiquidity -= withdrawAmount;
			balances.payoutToken[action.from] += withdrawAmount;
			balances.payoutToken.protocol -= withdrawAmount;

			break;
		}
		// User opens a 'paying fixed' swap, protocol is not receiving more fixed and paying more floating
		case ActionType.openPayFixedSwap: {
			// notional of new swap is stored in action.amount
			const swapFixedRate = getRate(
				SwapType.payFixed,
				action.amount,
				protocol,
				constants
			);

			const newFixedToReceive =
				(swapFixedRate * constants.swapDuration * action.amount) /
				constants.daysInYear;

			const newMaxFloatToPay =
				(action.amount *
					constants.maxPayoutRate *
					constants.swapDuration) /
				constants.daysInYear;

			// Untested
			assert(
				protocol.activeCollateral +
					newMaxFloatToPay -
					newFixedToReceive <
					protocol.totalLiquidity + precision,
				'Protocol would be undercollateralized by this swap'
			);

			// for interest accrual calcs
			protocol.avgFixedRateReceiving =
				(protocol.avgFixedRateReceiving *
					protocol.notionalReceivingFixed +
					action.amount * swapFixedRate) /
				(protocol.notionalReceivingFixed + action.amount);
			protocol.notionalReceivingFixed += action.amount;
			protocol.notionalPayingFloat += action.amount;

			// for collateral calcs
			protocol.fixedToReceive += newFixedToReceive;
			protocol.notionalDaysPayingFloat +=
				action.amount * constants.swapDuration;

			const userCollateral =
				(action.amount *
					constants.swapDuration *
					(swapFixedRate - constants.minPayoutRate)) /
				constants.daysInYear;

			// just for paper swaps
			assert(
				action.check == false || _.isUndefined(action.check),
				`swap fixed rate: ${swapFixedRate} user collateral ${userCollateral}`
			);

			balances.payoutToken[action.from] -= userCollateral;
			balances.payoutToken.protocol += userCollateral;

			protocol.swaps.push({
				type: SwapType.payFixed,
				notional: action.amount,
				initTime: protocol.time,
				swapRate: swapFixedRate,
				owner: action.from,
				initIndex: action.floatIndex,
				userCollateral: userCollateral
			});

			break;
		}
		// User is 'receiving fixed', protocol is now paying more fixed and receiving more float
		case ActionType.openReceiveFixedSwap: {
			// notional of new swap is stored in action.amount
			const swapFixedRate = getRate(
				SwapType.receiveFixed,
				action.amount,
				protocol,
				constants
			);

			const newFixedToPay =
				(swapFixedRate * constants.swapDuration * action.amount) /
				constants.daysInYear;

			const newMinFloatAssetToReceive =
				(constants.minPayoutRate *
					constants.swapDuration *
					action.amount) /
				constants.daysInYear;

			// untested
			assert(
				protocol.activeCollateral +
					newFixedToPay -
					newMinFloatAssetToReceive <
					protocol.totalLiquidity + precision,
				'Protocol would be undercollateralized by swap'
			);

			// for interest accrual
			protocol.avgFixedRatePaying =
				(protocol.avgFixedRatePaying * protocol.notionalPayingFixed +
					action.amount * swapFixedRate) /
				(protocol.notionalPayingFixed + action.amount);
			protocol.notionalPayingFixed += action.amount;
			protocol.notionalReceivingFloat += action.amount;

			// for collateral
			protocol.fixedToPay += newFixedToPay;
			protocol.notionalDaysReceivingFloat +=
				action.amount * constants.swapDuration;

			const userCollateral =
				(action.amount *
					constants.swapDuration *
					(constants.maxPayoutRate - swapFixedRate)) /
				constants.daysInYear;

			// just for paper swaps
			assert(
				action.check == false || _.isUndefined(action.check),
				`swap fixed rate: ${swapFixedRate} user collateral ${userCollateral}`
			);

			balances.payoutToken[action.from] -= userCollateral;
			balances.payoutToken.protocol += userCollateral;

			protocol.swaps.push({
				type: SwapType.receiveFixed,
				notional: action.amount,
				initTime: protocol.time,
				swapRate: swapFixedRate,
				owner: action.from,
				initIndex: action.floatIndex,
				userCollateral: userCollateral
			});

			break;
		}
		case ActionType.closeSwap: {
			const swap = protocol.swaps[action.orderNumber];
			const swapLength = protocol.time - swap.initTime;
			assert(
				swapLength >= constants.swapDuration,
				`Attempted to close swap ${action.orderNumber} prematurely`
			);

			// if a swap is closed at day 100 if it was a 90 day swap.
			// we'll have to undo the incorrect adjustments done to protocol profit and collateral
			const lateDays = swapLength - constants.swapDuration;

			// take the swap off the books
			if (swap.type == SwapType.payFixed) {
				const newNotionalReceiving =
					protocol.notionalReceivingFixed - swap.notional;
				protocol.avgFixedRateReceiving =
					newNotionalReceiving == 0
						? 0
						: (protocol.avgFixedRateReceiving *
								protocol.notionalReceivingFixed -
								swap.swapRate * swap.notional) /
						  newNotionalReceiving;
				protocol.notionalReceivingFixed -= swap.notional;
				protocol.notionalPayingFloat -=
					(swap.notional * action.floatIndex) / swap.initIndex;
				protocol.fixedToReceive +=
					(swap.notional * swap.swapRate * lateDays) /
					constants.daysInYear;
				// we applied too many days for this swap
				protocol.notionalDaysPayingFloat += swap.notional * lateDays;
			} else if (swap.type == SwapType.receiveFixed) {
				const newNotionalPaying =
					protocol.notionalPayingFixed - swap.notional;
				protocol.avgFixedRatePaying =
					newNotionalPaying == 0
						? 0
						: (protocol.avgFixedRatePaying *
								protocol.notionalPayingFixed -
								swap.swapRate * swap.notional) /
						  newNotionalPaying;
				protocol.notionalPayingFixed -= swap.notional;
				protocol.notionalReceivingFloat -=
					(swap.notional * action.floatIndex) / swap.initIndex;
				// we applied too many days for this swap
				protocol.notionalDaysReceivingFloat += swap.notional * lateDays;
				protocol.fixedToPay +=
					(swap.notional * swap.swapRate * lateDays) /
					constants.daysInYear;
			}

			const fixedLeg =
				(swap.notional * swap.swapRate * swapLength) /
				constants.daysInYear;

			const floatLeg =
				swap.notional * (action.floatIndex / swap.initIndex - 1);

			const userProfit =
				swap.type == SwapType.payFixed
					? floatLeg - fixedLeg
					: fixedLeg - floatLeg;

			// TODO: max / min profit bound, min profit bound based on minTarget / maxTarget rate when swap opened
			balances.payoutToken[swap.owner] +=
				swap.userCollateral + userProfit;
			balances.payoutToken.protocol -= swap.userCollateral + userProfit;
			// delete order
			protocol.swaps.splice(action.orderNumber, 1);
			break;
		}
		case ActionType.read: {
			// hack to just print numbers and accrue interest
			break;
		}
		default:
			throw new Error(`Invalid action ${action.type}`);
	}
	const senderBalance = balances.payoutToken[action.from];
	// only for paper swaps. in solidity this would be handled by erc20
	assert(
		balances.payoutToken[action.from] > 0 - precision ||
			ActionType.read == action.type,
		`${action.type} user has insufficient payout tokens ${senderBalance}`
	);
	// again, erc20 handles this
	assert(
		balances.payoutToken.protocol > 0 - precision,
		`${action.type} protocol has insufficient payout tokens ${balances.payoutToken.protocol}`
	);

	// Protocol should never have negative liquidity. erc20 handles this, but checking for tests
	assert(
		protocol.totalLiquidity > -precision,
		'Protocol undercollateralized'
	);
	// Active collateral can technically be negative. for example, one swap, and it is 'late'.
	// printNumbers(protocol, constants);
	return { protocol: protocol, balances: balances, constants: constants };
};
