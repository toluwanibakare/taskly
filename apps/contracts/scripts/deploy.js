const hre = require("hardhat");
const { ethers, network } = hre;

async function main() {
  console.log("Starting deployment on network:", network.name);

  // Mento USDm or cUSD addresses
  const tokenAddresses = {
    celoSepolia: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b", // USDm Mento
    celoAlfajores: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // cUSD
    hardhat: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // Fallback for local testing
  };

  const tokenAddress = tokenAddresses[network.name] || tokenAddresses.celoSepolia;
  console.log(`Using Stable Token Address: ${tokenAddress}`);

  const TasklyEscrow = await ethers.getContractFactory("TasklyEscrow");
  const escrow = await TasklyEscrow.deploy(tokenAddress);

  await escrow.waitForDeployment();

  const contractAddress = await escrow.getAddress();
  console.log("TasklyEscrow deployed to:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
