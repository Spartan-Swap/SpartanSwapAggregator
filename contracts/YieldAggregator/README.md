## Vault Factory

Permissionless LP/token vault design:
- Anyone can deploy a vault using the factory for a single asset
- i.e. BNB vault (single stake BNB) |OR| BNB:SPARTA vault (stake BNB:SPARTA LP tokens)
- Discuss: Only allow like-yield (stake BNB for BNB yield / stake BNB-LPs for same BNB-LPs yield) |OR| allow anyone to put up any asset as the yield reward (but still keep it as only one yield asset) |OR| allow any asset to be added as yield rewards however swap/deposit it into the like-asset on the way in
- In terms of 'weight' a single-asset vault will be very simple in terms of calculating weight/rewards as there will be only one asset and the underlying value is irrelevant (we only need to know how much the user deposited vs the total vault's deposited amount)

This should serve to provide a solution for projects looking to provide single-staking programs for their token (reduce 'circulating' supply of a token) along with the more sustainable incentive models for staking 2nd layer revenue-bearing assets like LP tokens (bootstrap liquidity)

Make sure to allow for all the common customisations that projects may want for their program:
- Allow for timelock in seconds units (allow a range from no lockup period to very long term months/years) - this could mean an easy setup with fixed yield like a term deposit (could even allow leaving early with forfeiture of yield)
- Also allow for a more dynamic system were users can enter or leave any time but a `secondsSinceLastClaim` is used to incentivize longer-term lockup (should use a variable to set a minimum-seconds threshold for yield as a multiple of the chain's blocktime)
- Allow vault creator to set the deposit asset and yield-payout asset (maybe immutable after the first init though, can always create a new vault with the same asset if change is wanted)

- Consider the events that yield aggregators might look for with automating these vaults into their interfaces, what info would an indexer need to know when a vault is created and what information is important to be available inside the event

## Yield Aggregator (This may not need to be in contracts, probably DApp to start with at least)

Aggregate yield programs (staking, AMM/liquidity, hedge-fund-like-DAOs etc)
- calc their yields and show them all together in one interface for users to find a program they are interested in
- early stage could just have a link to an interface to join each strategy, but over time we could make it so you can enter any strategy from this interface (with any asset via the swap aggregator. i.e. 'invest' in a BNB:BUSD pool with $1,000 worth of ETH: $500 of the ETH gets swapped to BNB, the other $500 swapped to BUSD and then both added to the pool, user receives their LP tokens and is notified there is a vault they can now deposit them into or even have the interface able to do that for them if they select the vault as the strategy instead of the pool)