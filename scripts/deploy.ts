import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";
import * as fs from "fs";
import {
  CHAIN_A_URL, CHAIN_B_URL, DEPLOYER_KEY, RELAYER_KEY,
} from "./config";

function loadArtifact(name: string) {
  const path = `artifacts/contracts/${name}.sol/${name}.json`;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

async function deploy(name: string, wallet: Wallet, args: any[] = []) {
  const { abi, bytecode } = loadArtifact(name);
  const factory = new ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`${name} deployed at ${address}`);
  return { contract, address };
}

async function main() {
  const providerA = new JsonRpcProvider(CHAIN_A_URL, undefined, { cacheTimeout: -1 });
  const providerB = new JsonRpcProvider(CHAIN_B_URL, undefined, { cacheTimeout: -1 });
  const deployerA = new Wallet(DEPLOYER_KEY, providerA);
  const deployerB = new Wallet(DEPLOYER_KEY, providerB);
  const relayerAddress = new Wallet(RELAYER_KEY).address;

  console.log("--- Chain A ---");
  const token = await deploy("TestToken", deployerA);
  const lock = await deploy("BridgeLock", deployerA, [token.address]);

  console.log("--- Chain B ---");
  const wrapped = await deploy("WrappedToken", deployerB);
  const mint = await deploy("BridgeMint", deployerB, [wrapped.address, relayerAddress]);

  const tx = await (wrapped.contract as any).setMinter(mint.address);
  await tx.wait();
  console.log(`wTOK minter set to BridgeMint (${mint.address})`);

  const addresses = {
    token: token.address,
    lock: lock.address,
    wrapped: wrapped.address,
    mint: mint.address,
    relayer: relayerAddress,
  };
  fs.writeFileSync("deployments.json", JSON.stringify(addresses, null, 2));
  console.log("Saved addresses to deployments.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
