import {
  JsonRpcProvider, Wallet, Contract, getBytes, solidityPackedKeccak256,
} from "ethers";
import * as fs from "fs";
import { CHAIN_A_URL, CHAIN_B_URL, RELAYER_KEY } from "./config";

function loadAbi(name: string) {
  return JSON.parse(
    fs.readFileSync(`artifacts/contracts/${name}.sol/${name}.json`, "utf8")
  ).abi;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const addrs = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
  const opts = { cacheTimeout: -1 };
  const providerA = new JsonRpcProvider(CHAIN_A_URL, undefined, opts);
  const providerB = new JsonRpcProvider(CHAIN_B_URL, undefined, opts);

  const relayer = new Wallet(RELAYER_KEY, providerB);
  const lock = new Contract(addrs.lock, loadAbi("BridgeLock"), providerA);
  const mint = new Contract(addrs.mint, loadAbi("BridgeMint"), relayer);

  let nextBlock = (await providerA.getBlockNumber()) + 1;
  console.log(`Relayer ${relayer.address} watching Chain A from block ${nextBlock}...`);

  while (true) {
    const latest = await providerA.getBlockNumber();
    if (latest >= nextBlock) {
      const events = await lock.queryFilter(lock.filters.Deposit(), nextBlock, latest);
      for (const ev of events) {
        const { sender, amount } = (ev as any).args;
        console.log(`Deposit seen: ${sender} locked ${amount} units`);

        const hash = solidityPackedKeccak256(["address", "uint256"], [sender, amount]);
        const signature = await relayer.signMessage(getBytes(hash));

        const tx = await mint.mintWithSignature(sender, amount, signature);
        await tx.wait();
        console.log(`  -> minted ${amount} wTOK to ${sender} on Chain B`);
      }
      nextBlock = latest + 1;
    }
    await sleep(1000);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
