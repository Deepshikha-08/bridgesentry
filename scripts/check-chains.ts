import { JsonRpcProvider } from "ethers";

async function main() {
  const chains = [
    { name: "Chain A", url: "http://127.0.0.1:8545" },
    { name: "Chain B", url: "http://127.0.0.1:8546" },
  ];

  for (const chain of chains) {
    const provider = new JsonRpcProvider(chain.url);
    const network = await provider.getNetwork();
    const block = await provider.getBlockNumber();
    console.log(`${chain.name}: chainId=${network.chainId}, block=${block}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
