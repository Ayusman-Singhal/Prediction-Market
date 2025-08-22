# Prediction Market (Binary Outcome)

## 1. Project Title
Prediction Market

## 2. Project Description

A minimal on-chain binary outcome prediction market built in Clarity for the Stacks blockchain. Users place a single STX bet on either YES (true) or NO (false) for a specific event. Once the event occurs, a trusted oracle (the contract deployer) resolves the market by declaring the final outcome. Winning participants can then claim their proportional share of the total pooled stakes.

You can interact with this contract using the Leather wallet, a secure browser wallet for Stacks.

This implementation is intentionally lightweight: it exposes only two public functions (bet and settle) to demonstrate the core lifecycle of a binary prediction market while keeping the contract surface area very small.

## 3. Project Vision
Provide a foundational, auditable, and easily extensible binary prediction market primitive on Stacks. The goals are:
- Simplicity: Minimal functions for clarity of logic and security review.
- Fair Payouts: Winners share the full pooled STX based on stake proportion.
- Oracle Driven: Resolution by a designated oracle to bootstrap early use cases.
- Extensibility: Serve as a base for future upgrades (multi-market registry, decentralized oracles, fee mechanics, multi-event support, etc.).

## 4. Future Scope
Potential enhancements include:
1. Multiple Concurrent Markets: Generalize to handle many events with unique IDs.
2. Decentralized Oracle Layer: Integrate trust-minimized oracle networks or threshold signatures.
3. Dispute & Appeal Windows: Allow challenges before final settlement.
4. Fee & Treasury Mechanism: Protocol or creator fees on winning payouts.
5. Tokenization of Positions: Mint transferable LONG / SHORT position tokens (SIP-010 compatible).
6. Partial Cash-Out: Add ability to sell a position before resolution via AMM style bonding curves.
7. Market Creation Function: Allow any user to create a new market with parameters (expiry, question, oracle, fees).
8. Time-Based Restrictions: Enforce cutoff timestamp after which no new bets are accepted.
9. Result Provenance Metadata: Store oracle signature or external proof hash on-chain.
10. UI / Indexer Integration: Provide off-chain services for cataloging active markets and analytics.

## 5. Contract Address Details
- **Contract ID**: `ST59Z12GNN22Z5AD01TW3940PRB0ZESKQ0EJ03Y2.prediction-market`

![alt text](image.png)