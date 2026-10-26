import { JsonRpcProvider, Wallet, Contract, parseUnits, formatUnits } from "ethers";
import * as fs from "fs";
import { CHAIN_A_URL, CHAIN_B_URL, DEPLOYER_KEY } from "./config";

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

  const user = new Wallet(DEPLOYER_KEY, providerA);
  const token = new Contract(addrs.token, loadAbi("TestToken"), user);
  const lock = new Contract(addrs.lock, loadAbi("BridgeLock"), user);
  const wrapped = new Contract(addrs.wrapped, loadAbi("WrappedToken"), providerB);

  const amount = parseUnits("10", 18);

  await (await token.approve(addrs.lock, amount)).wait();
  console.log("Approved bridge to take 10 TOK");
  await (await lock.deposit(amount)).wait();
  console.log("Deposited 10 TOK into BridgeLock on Chain A");

  for (let i = 0; i < 10; i++) {
    await sleep(1000);
    const bal = await wrapped.balanceOf(user.address);
    if (bal > 0n) break;
  }

  const locked = await token.balanceOf(addrs.lock);
  const minted = await wrapped.balanceOf(user.address);
  console.log(`Locked on Chain A:  ${formatUnits(locked, 18)} TOK`);
  console.log(`Minted on Chain B:  ${formatUnits(minted, 18)} wTOK`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
