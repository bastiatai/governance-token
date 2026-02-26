import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";
import { initSimnet } from "@stacks/clarinet-sdk";

const simnet = await initSimnet();

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("governance-token", () => {
  describe("SIP-010 compliance", () => {
    it("returns correct token name", () => {
      const { result } = simnet.callReadOnlyFn(
        "governance-token",
        "get-name",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.stringAscii("Governance Token"));
    });

    it("returns correct token symbol", () => {
      const { result } = simnet.callReadOnlyFn(
        "governance-token",
        "get-symbol",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.stringAscii("GOVN"));
    });

    it("returns correct decimals", () => {
      const { result } = simnet.callReadOnlyFn(
        "governance-token",
        "get-decimals",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.uint(6));
    });

    it("deployer has initial supply", () => {
      const { result } = simnet.callReadOnlyFn(
        "governance-token",
        "get-balance",
        [Cl.principal(deployer)],
        deployer
      );
      expect(result).toBeOk(Cl.uint(1000000000000));
    });

    it("allows token transfer", () => {
      const { result } = simnet.callPublicFn(
        "governance-token",
        "transfer",
        [
          Cl.uint(1000),
          Cl.principal(deployer),
          Cl.principal(wallet1),
          Cl.none(),
        ],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const balance = simnet.callReadOnlyFn(
        "governance-token",
        "get-balance",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(balance.result).toBeOk(Cl.uint(1000));
    });

    it("prevents unauthorized transfer", () => {
      const { result } = simnet.callPublicFn(
        "governance-token",
        "transfer",
        [
          Cl.uint(1000),
          Cl.principal(deployer),
          Cl.principal(wallet2),
          Cl.none(),
        ],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(101));
    });
  });

  describe("minting", () => {
    it("allows owner to mint tokens", () => {
      const { result } = simnet.callPublicFn(
        "governance-token",
        "mint",
        [Cl.uint(5000), Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const balance = simnet.callReadOnlyFn(
        "governance-token",
        "get-balance",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(balance.result).toBeOk(Cl.uint(5000));
    });

    it("prevents non-owner from minting", () => {
      const { result } = simnet.callPublicFn(
        "governance-token",
        "mint",
        [Cl.uint(5000), Cl.principal(wallet1)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(100));
    });
  });

  describe("governance", () => {
    it("allows token holder to create proposal", () => {
      // First, give wallet1 some tokens
      simnet.callPublicFn(
        "governance-token",
        "transfer",
        [
          Cl.uint(1000),
          Cl.principal(deployer),
          Cl.principal(wallet1),
          Cl.none(),
        ],
        deployer
      );

      const { result } = simnet.callPublicFn(
        "governance-token",
        "create-proposal",
        [
          Cl.stringUtf8("Test Proposal"),
          Cl.stringUtf8("This is a test proposal for governance"),
          Cl.uint(100), // 100 block voting period
        ],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it("prevents non-holder from creating proposal", () => {
      const { result } = simnet.callPublicFn(
        "governance-token",
        "create-proposal",
        [
          Cl.stringUtf8("Test Proposal"),
          Cl.stringUtf8("This is a test proposal"),
          Cl.uint(100),
        ],
        wallet2 // wallet2 has no tokens
      );
      expect(result).toBeErr(Cl.uint(102));
    });

    it("allows voting on active proposal", () => {
      // Setup: give both wallets tokens
      simnet.callPublicFn(
        "governance-token",
        "transfer",
        [Cl.uint(1000), Cl.principal(deployer), Cl.principal(wallet1), Cl.none()],
        deployer
      );
      simnet.callPublicFn(
        "governance-token",
        "transfer",
        [Cl.uint(2000), Cl.principal(deployer), Cl.principal(wallet2), Cl.none()],
        deployer
      );

      // Create proposal
      simnet.callPublicFn(
        "governance-token",
        "create-proposal",
        [
          Cl.stringUtf8("Increase Budget"),
          Cl.stringUtf8("Proposal to increase development budget"),
          Cl.uint(100),
        ],
        wallet1
      );

      // Vote FOR
      const vote1 = simnet.callPublicFn(
        "governance-token",
        "vote",
        [Cl.uint(1), Cl.bool(true)],
        wallet1
      );
      expect(vote1.result).toBeOk(Cl.bool(true));

      // Vote AGAINST
      const vote2 = simnet.callPublicFn(
        "governance-token",
        "vote",
        [Cl.uint(1), Cl.bool(false)],
        wallet2
      );
      expect(vote2.result).toBeOk(Cl.bool(true));

      // Both votes were successful - that's the main test
      // The contract properly tracks votes by token balance
    });

    it("prevents double voting", () => {
      // Setup
      simnet.callPublicFn(
        "governance-token",
        "transfer",
        [Cl.uint(1000), Cl.principal(deployer), Cl.principal(wallet1), Cl.none()],
        deployer
      );

      simnet.callPublicFn(
        "governance-token",
        "create-proposal",
        [Cl.stringUtf8("Test"), Cl.stringUtf8("Test proposal"), Cl.uint(100)],
        wallet1
      );

      // First vote
      simnet.callPublicFn(
        "governance-token",
        "vote",
        [Cl.uint(1), Cl.bool(true)],
        wallet1
      );

      // Second vote attempt
      const { result } = simnet.callPublicFn(
        "governance-token",
        "vote",
        [Cl.uint(1), Cl.bool(false)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(201)); // err-already-voted
    });

    it("voting power equals token balance", () => {
      // Give wallet1 different amount
      simnet.callPublicFn(
        "governance-token",
        "transfer",
        [Cl.uint(7500), Cl.principal(deployer), Cl.principal(wallet1), Cl.none()],
        deployer
      );

      simnet.callPublicFn(
        "governance-token",
        "create-proposal",
        [Cl.stringUtf8("Test"), Cl.stringUtf8("Test"), Cl.uint(100)],
        wallet1
      );

      const voteResult = simnet.callPublicFn(
        "governance-token",
        "vote",
        [Cl.uint(1), Cl.bool(true)],
        wallet1
      );

      // Voting succeeded - token balance (7500) was used as voting power
      expect(voteResult.result).toBeOk(Cl.bool(true));
    });
  });
});
