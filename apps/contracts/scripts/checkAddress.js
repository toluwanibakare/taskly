const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;
  const balance = await provider.getBalance(deployer.address);
  console.log("DEPLOYER ADDRESS:", deployer.address);
  console.log("DEPLOYER BALANCE:", hre.ethers.formatEther(balance), "CELO");
}

main().catch(console.error);
