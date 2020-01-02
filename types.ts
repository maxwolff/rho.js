// ===== PROTOCOL STORAGE =====

export interface State {
	protocol: ProtocolState;
	balances: Balances;
	constants: Constants;
}

export interface Swap {
	type: SwapType;
	notional: number;
	initTime: number;
	swapRate: number;
	owner: string;
	initIndex: number;
	userCollateral: number;
}

export enum SwapType {
	payFixed = 'payFixed', // the user pays fixed, the protocol receives fixed
	receiveFixed = 'receiveFixed' // the user receives fixed, the protocol pays fixed
}

export interface ProtocolState {
	activeCollateral: number; // collateral currently being used for outstanding swaps. declines as swaps mature.
	totalLiquidity: number; // total supplied + profits
	supplyIndex: number; // determines liquidity provider profit

	// notional amount that floating rates are applied to. continuously compounds.
	notionalReceivingFloat: number;
	notionalPayingFloat: number;

	// notional amount that fixed rates are applied to. does not compound
	notionalPayingFixed: number;
	notionalReceivingFixed: number;

	// fixed rate to charge or pay swappers. the average of all outstanding swaps
	avgFixedRatePaying: number;
	avgFixedRateReceiving: number;

	// the aggregate of both fixed legs of all swaps.
	fixedToPay: number;
	fixedToReceive: number;

	// think of this as max / min float to pay / receive. only used in active collateral calcs
	// too difficult to calculate as compounding, so we use notionalPayingFixed to calc as it is non-compounding
	notionalDaysReceivingFloat: number;
	notionalDaysPayingFloat: number;

	// a variable used in swap rate calcs
	rateFactor: number;

	time: number;
	lastFloatIndex: number;
	swaps: Swap[];
	liquidityAccounts: LiquidityAccounts;
}

export interface LiquidityAccounts {
	[key: string]: {
		amount: number;
		lastDepositTime: number;
		depositSupplyIndex: number;
	};
}

export interface Balances {
	payoutToken: {
		[key: string]: number;
	};
}

export interface Constants {
	swapDuration: number; // in days
	daysInYear: number; // allows us to use 360, easier math in tests

	// for rate curve
	yOffset: number;
	range: number;
	slopeFactor: number; // sets graph steepness

	rateFactorSensitivity: number;

	// for fee calcs
	feeBase: number; // sets min fee
	feeMultiplier: number; // sets how utilization moves the fee?

	// used for collateral calculations and payout bounds
	maxPayoutRate: number;
	minPayoutRate: number;
}

// ===== PROTOCOL INPUT =====

export interface Action {
	from: string;
	type: ActionType;
	amount?: number;
	orderNumber?: number; // for close swap
	yOffset?: number; // for updateModel
	check?: boolean;
	feeBase?: number;
	feeMultiplier?: number;
	time: number;
	floatRate?: number;
	floatIndex: number;
}

export enum ActionType {
	addLiquidity = 'addLiquidity',
	openPayFixedSwap = 'openPayFixedSwap',
	openReceiveFixedSwap = 'openReceiveFixedSwap',
	closeSwap = 'closeSwap',
	removeLiquidity = 'removeLiquidity',
	updateModel = 'updateModel',

	// just for paper swaps
	read = 'read',
	updateFee = 'updateFee'
}

// ===== SCENARIO TESTS  =====

export interface InputAction {
	from: string;
	type: ActionType;
	amount?: number;
	orderNumber?: number; // for close swap
	time: number;
	floatRate?: number; // avg rate since last action, used to calculate floatIndex. if ommitted, we read from Compound.
}

export interface Scenario {
	name: string;
	actions: Action[] | InputAction[];
	expect: { [key: string]: any };
}

export interface StateConfig {
	initPayoutTokenBalance: number;
	constants: Constants;
}

// ===== PAPER SWAP STORAGE =====

export interface InitState {
	state: State;
	initDateTime: number;
}

export interface PaperSwapEntry {
	action: Action;
	state: State;
}

export interface PaperSwapStorage {
	init: InitState;
	entries: PaperSwapEntry[];
}
