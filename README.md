# Rho.js

A javascript reference implementation of an automated market maker interest rate swaps protocol. Includes a scenario test runner and a cli for quick testing. Numbers for integration tests from this [spreadsheet](https://docs.google.com/spreadsheets/d/1TB2Z3tRs5bjWrhqix3-gdbVwpWC7m1a4KeHwgws4Tkg/edit#gid=1157878981), and from a week long test simulation.

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
