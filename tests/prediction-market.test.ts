import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("Prediction Market Tests", () => {
  it("ensures simnet is well initialised", () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it("should initialize market successfully", () => {
    const question = "Will Bitcoin reach $100,000 by end of 2025?";
    const deadline = simnet.blockHeight + 100;
    
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "initialize-market",
      [Cl.stringAscii(question), Cl.uint(deadline)],
      deployer
    );
    
    expect(result).toBeOk(Cl.bool(true));
  });

  it("should get market info", () => {
    // First initialize the market
    const question = "Will Bitcoin reach $100,000 by end of 2025?";
    const deadline = simnet.blockHeight + 100;
    
    simnet.callPublicFn(
      "prediction-market",
      "initialize-market",
      [Cl.stringAscii(question), Cl.uint(deadline)],
      deployer
    );

    const { result } = simnet.callReadOnlyFn(
      "prediction-market",
      "get-market-info",
      [],
      wallet1
    );
    
    expect(result).toBeOk(Cl.tuple({
      question: Cl.stringAscii(question),
      deadline: Cl.uint(deadline),
      resolved: Cl.bool(false),
      "winning-outcome": Cl.bool(false),
      "total-yes-bets": Cl.uint(0),
      "total-no-bets": Cl.uint(0)
    }));
  });

  it("should allow placing bets", () => {
    // Initialize market first
    const question = "Will Bitcoin reach $100,000 by end of 2025?";
    const deadline = simnet.blockHeight + 100;
    
    simnet.callPublicFn(
      "prediction-market",
      "initialize-market",
      [Cl.stringAscii(question), Cl.uint(deadline)],
      deployer
    );

    // Place a YES bet
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "place-bet",
      [Cl.bool(true), Cl.uint(1000)],
      wallet1
    );
    
    expect(result).toBeOk(Cl.bool(true));
  });

  it("should prevent betting after deadline", () => {
    // Initialize market with past deadline
    const question = "Will Bitcoin reach $100,000 by end of 2025?";
    const deadline = simnet.blockHeight - 1;
    
    simnet.callPublicFn(
      "prediction-market",
      "initialize-market",
      [Cl.stringAscii(question), Cl.uint(deadline)],
      deployer
    );

    // Try to place a bet (should fail)
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "place-bet",
      [Cl.bool(true), Cl.uint(1000)],
      wallet1
    );
    
    expect(result).toBeErr(Cl.uint(102)); // err-market-closed
  });

  it("should allow oracle to resolve market", () => {
    // Initialize market
    const question = "Will Bitcoin reach $100,000 by end of 2025?";
    const deadline = simnet.blockHeight + 10;
    
    simnet.callPublicFn(
      "prediction-market",
      "initialize-market",
      [Cl.stringAscii(question), Cl.uint(deadline)],
      deployer
    );

    // Mine blocks to pass deadline
    simnet.mineEmptyBlocks(15);

    // Resolve market
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "resolve-market",
      [Cl.bool(true)],
      deployer
    );
    
    expect(result).toBeOk(Cl.bool(true));
  });

  it("should calculate and distribute winnings correctly", () => {
    // Initialize market
    const question = "Will Bitcoin reach $100,000 by end of 2025?";
    const deadline = simnet.blockHeight + 100;
    
    simnet.callPublicFn(
      "prediction-market",
      "initialize-market",
      [Cl.stringAscii(question), Cl.uint(deadline)],
      deployer
    );

    // Place bets
    simnet.callPublicFn("prediction-market", "place-bet", [Cl.bool(true), Cl.uint(1000)], wallet1);
    simnet.callPublicFn("prediction-market", "place-bet", [Cl.bool(false), Cl.uint(2000)], wallet2);

    // Mine blocks to pass deadline
    simnet.mineEmptyBlocks(105);

    // Resolve market with YES outcome
    simnet.callPublicFn("prediction-market", "resolve-market", [Cl.bool(true)], deployer);

    // Check market status
    const { result: statusResult } = simnet.callReadOnlyFn(
      "prediction-market",
      "get-market-status",
      [],
      wallet1
    );

    expect(statusResult).toBeOk(Cl.tuple({
      "is-open": Cl.bool(false),
      "can-resolve": Cl.bool(false),
      "can-claim": Cl.bool(true)
    }));

    // Claim winnings for wallet1 (winner)
    const { result: claimResult } = simnet.callPublicFn(
      "prediction-market",
      "claim-winnings",
      [],
      wallet1
    );

    // Should receive original bet + proportional share of losing bets
    expect(claimResult).toBeOk(Cl.uint(3000)); // 1000 (original) + 2000 (from losing side)
  });

  it("should prevent non-owner from resolving market", () => {
    // Initialize market
    const question = "Will Bitcoin reach $100,000 by end of 2025?";
    const deadline = simnet.blockHeight + 10;
    
    simnet.callPublicFn(
      "prediction-market",
      "initialize-market",
      [Cl.stringAscii(question), Cl.uint(deadline)],
      deployer
    );

    // Mine blocks to pass deadline
    simnet.mineEmptyBlocks(15);

    // Try to resolve market as non-owner (should fail)
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "resolve-market",
      [Cl.bool(true)],
      wallet1
    );
    
    expect(result).toBeErr(Cl.uint(100)); // err-owner-only
  });

  it("should prevent claiming when market is not resolved", () => {
    // Initialize market
    const question = "Will Bitcoin reach $100,000 by end of 2025?";
    const deadline = simnet.blockHeight + 100;
    
    simnet.callPublicFn(
      "prediction-market",
      "initialize-market",
      [Cl.stringAscii(question), Cl.uint(deadline)],
      deployer
    );

    // Place a bet
    simnet.callPublicFn("prediction-market", "place-bet", [Cl.bool(true), Cl.uint(1000)], wallet1);

    // Try to claim without resolving (should fail)
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "claim-winnings",
      [],
      wallet1
    );
    
    expect(result).toBeErr(Cl.uint(103)); // err-market-not-resolved
  });
});
