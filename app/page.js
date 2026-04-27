"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";

const TOKEN_ADDRESS = "0x0CB65761CD2AB64129C3e89400a281AB8083cFf1";
const STAKING_ADDRESS = "0x423405C3926499ffBfbaD1c319DF4Cf1F524998D";

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const STAKING_ABI = [
  "function stake(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function claimReward() external",
  "function earned(address account) view returns (uint256)",
  "function balances(address account) view returns (uint256)",
  "function availableRewards() view returns (uint256)",
  "function token() view returns (address)",
];

export default function Home() {
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [stakedBalance, setStakedBalance] = useState("0");
  const [reward, setReward] = useState("0");
  const [rewardPool, setRewardPool] = useState("0");
  const [symbol, setSymbol] = useState("MTK");
  const [decimals, setDecimals] = useState(18);
  const [status, setStatus] = useState("Connect your wallet to start staking");
  const [loading, setLoading] = useState(false);

  async function getContracts() {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
    const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);

    return { provider, signer, token, staking };
  }

  function shortAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  async function connectWallet() {
    try {
      setLoading(true);
      setStatus("Connecting wallet...");

      const { signer } = await getContracts();
      const address = await signer.getAddress();

      setAccount(address);
      setStatus("Wallet connected successfully");

      await loadData(address);
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Wallet connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadData(address = account) {
    try {
      if (!address) return;

      const { token, staking } = await getContracts();

      const tokenDecimals = await token.decimals();
      const tokenSymbol = await token.symbol();

      const balance = await token.balanceOf(address);
      const staked = await staking.balances(address);
      const earnedReward = await staking.earned(address);
      const pool = await staking.availableRewards();

      setDecimals(Number(tokenDecimals));
      setSymbol(tokenSymbol);

      setTokenBalance(ethers.formatUnits(balance, tokenDecimals));
      setStakedBalance(ethers.formatUnits(staked, tokenDecimals));
      setReward(ethers.formatUnits(earnedReward, tokenDecimals));
      setRewardPool(ethers.formatUnits(pool, tokenDecimals));
    } catch (error) {
      console.error(error);
      setStatus("Could not load contract data");
    }
  }

  async function approveTokens() {
    if (!amount || Number(amount) <= 0) {
      setStatus("Enter a valid amount first");
      return;
    }

    try {
      setLoading(true);
      setStatus("Approving tokens...");

      const { token } = await getContracts();
      const value = ethers.parseUnits(amount, decimals);

      const tx = await token.approve(STAKING_ADDRESS, value);
      await tx.wait();

      setStatus("Approve successful. Now you can stake tokens.");
    } catch (error) {
      console.error(error);
      setStatus("Approve failed");
    } finally {
      setLoading(false);
    }
  }

  async function stakeTokens() {
    if (!amount || Number(amount) <= 0) {
      setStatus("Enter a valid amount first");
      return;
    }

    try {
      setLoading(true);
      setStatus("Staking tokens...");

      const { staking } = await getContracts();
      const value = ethers.parseUnits(amount, decimals);

      const tx = await staking.stake(value);
      await tx.wait();

      setStatus("Tokens staked successfully");
      setAmount("");
      await loadData();
    } catch (error) {
      console.error(error);
      setStatus("Stake failed. Make sure you approved tokens first.");
    } finally {
      setLoading(false);
    }
  }

  async function withdrawTokens() {
    if (!amount || Number(amount) <= 0) {
      setStatus("Enter a valid amount first");
      return;
    }

    try {
      setLoading(true);
      setStatus("Withdrawing tokens...");

      const { staking } = await getContracts();
      const value = ethers.parseUnits(amount, decimals);

      const tx = await staking.withdraw(value);
      await tx.wait();

      setStatus("Tokens withdrawn successfully");
      setAmount("");
      await loadData();
    } catch (error) {
      console.error(error);
      setStatus("Withdraw failed");
    } finally {
      setLoading(false);
    }
  }

  async function claimReward() {
    try {
      setLoading(true);
      setStatus("Claiming reward...");

      const { staking } = await getContracts();

      const tx = await staking.claimReward();
      await tx.wait();

      setStatus("Reward claimed successfully");
      await loadData();
    } catch (error) {
      console.error(error);
      setStatus("Claim failed. Maybe reward is still zero.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (account) {
      loadData(account);
    }
  }, [account]);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="badge">DeFi Staking dApp</p>
          <h1>Stake your tokens and earn rewards</h1>
          <p className="subtitle">
            Simple staking platform built with Solidity, Remix, MetaMask and Next.js.
          </p>
        </div>

        <div className="wallet-card">
          <p className="label">Wallet</p>

          {account ? (
            <>
              <h3>{shortAddress(account)}</h3>
              <p className="connected">Connected</p>
            </>
          ) : (
            <>
              <h3>Not connected</h3>
              <button onClick={connectWallet} disabled={loading}>
                Connect Wallet
              </button>
            </>
          )}
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <p>Your Balance</p>
          <h2>{Number(tokenBalance).toFixed(4)}</h2>
          <span>{symbol}</span>
        </div>

        <div className="stat-card">
          <p>Staked</p>
          <h2>{Number(stakedBalance).toFixed(4)}</h2>
          <span>{symbol}</span>
        </div>

        <div className="stat-card">
          <p>Earned Reward</p>
          <h2>{Number(reward).toFixed(6)}</h2>
          <span>{symbol}</span>
        </div>

        <div className="stat-card">
          <p>Reward Pool</p>
          <h2>{Number(rewardPool).toFixed(2)}</h2>
          <span>{symbol}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Staking Panel</h2>
            <p>Approve tokens first, then stake them into the contract.</p>
          </div>

          <button className="secondary" onClick={() => loadData()} disabled={!account || loading}>
            Refresh
          </button>
        </div>

        <div className="input-box">
          <label>Amount</label>
          <input
            type="number"
            placeholder="Example: 10"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!account || loading}
          />
        </div>

        <div className="actions">
          <button onClick={approveTokens} disabled={!account || loading}>
            Approve
          </button>

          <button onClick={stakeTokens} disabled={!account || loading}>
            Stake
          </button>

          <button onClick={withdrawTokens} disabled={!account || loading}>
            Withdraw
          </button>

          <button onClick={claimReward} disabled={!account || loading}>
            Claim Reward
          </button>
        </div>

        <div className="status-box">
          <span>Status:</span>
          <p>{loading ? "Transaction is processing..." : status}</p>
        </div>
      </section>

      <section className="contract-info">
        <h3>Contract addresses</h3>

        <div>
          <p>Token Contract</p>
          <code>{TOKEN_ADDRESS}</code>
        </div>

        <div>
          <p>Staking Contract</p>
          <code>{STAKING_ADDRESS}</code>
        </div>
      </section>
    </main>
  );
}