# rho.js

A javascript reference implementation of an automated market maker interest rate swaps protocol. Includes a scenario test runner and a cli for quick testing.

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

-   [Whitepaper](http://maxcwolff.com/rho.pdf)
-   [Spec](http://maxcwolff.com/rhoSpec.pdf)
-   [Spreadsheet](https://docs.google.com/spreadsheets/d/1w2EEdeKWvx7haG0p8vp5h9kBmOGBXVOpb6UTZOOV1io/edit?usp=sharing)
-   [Interest Rate Model](https://observablehq.com/d/8a889476c0bddfff)
