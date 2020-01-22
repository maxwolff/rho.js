# Rho.js

A javascript reference implementation of an automated market maker interest rate swaps protocol. Includes a scenario test runner and a cli for quick testing. Numbers for integration tests from this [spreadsheet](https://docs.google.com/spreadsheets/d/1w2EEdeKWvx7haG0p8vp5h9kBmOGBXVOpb6UTZOOV1io/edit?usp=sharing), and from a week long test simulation.

## Usage

```
yarn install
```

```
yarn test
```

### Cli

Runs actions one by one prints intermediate states

-   `yarn cli init --users max jared coburn`
-   `yarn cli mm`
-   `yarn cli apply --type openPayFixedSwap --amount 300 --from jared`
-   `yarn cli apply --type openReceiveFixedSwap --amount 300 --from coburn`
-   `yarn cli read`
-   `yarn cli close`

## Resources

-   [Whitepaper](maxcwolff.com/rho.pdf)
-   [Spec](maxcwolff.com/rhoSpec.pdf)
