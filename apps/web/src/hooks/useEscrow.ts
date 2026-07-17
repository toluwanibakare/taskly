import { useChainId, useWriteContract, useReadContract } from "wagmi";
import { ESCROW_ABI } from "@/lib/escrowAbi";
import { getUsdmAddress } from "@/lib/app-utils";
import { parseUnits, keccak256, toBytes } from "viem";

// Mappings for deployed Escrow contract addresses per Celo network chain ID
const ESCROW_CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  42220: (process.env.NEXT_PUBLIC_ESCROW_ADDRESS_MAINNET || "0x89ebD3C199456E1C25A42B5D393C6249b1233713") as `0x${string}`, // Mainnet
  44787: (process.env.NEXT_PUBLIC_ESCROW_ADDRESS_ALFAJORES || "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1") as `0x${string}`, // Alfajores Testnet
  11142220: (process.env.NEXT_PUBLIC_ESCROW_ADDRESS_SEPOLIA || "0x9fD34F2D34e288257269eF0fc9770431D736FC48") as `0x${string}`, // Sepolia Testnet
};

export const getEscrowAddress = (chainId: number): `0x${string}` => {
  return ESCROW_CONTRACT_ADDRESSES[chainId] || "0x0000000000000000000000000000000000000000";
};

/**
 * Converts a string taskId into a 32-byte keccak256 hash (bytes32 hex string) for solidity storage.
 * This is the standard, collision-resistant approach used in Solidity's abi.encodeWithSignature.
 */
export const formatTaskIdToBytes32 = (taskId: string): `0x${string}` => {
  // keccak256 always produces exactly 32 bytes - safe for bytes32 params
  return keccak256(toBytes(taskId)) as `0x${string}`;
};

export function useEscrow() {
  const chainId = useChainId();
  const contractAddress = getEscrowAddress(chainId);
  const { writeContractAsync } = useWriteContract();

  // Create an escrow campaign (Advertiser locks tokens for task rewards)
  const createCampaign = async (
    taskId: string,
    rewardPerSlot: number,
    totalSlots: number,
    durationSeconds: number
  ) => {
    if (contractAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error(`Escrow contract not configured for chain ID ${chainId}`);
    }

    const rewardWei = parseUnits(rewardPerSlot.toString(), 18);
    const bytes32TaskId = formatTaskIdToBytes32(taskId);

    const usdmAddress = getUsdmAddress(chainId);

    return writeContractAsync({
      address: contractAddress,
      abi: ESCROW_ABI,
      functionName: "createCampaign",
      args: [bytes32TaskId, rewardWei, BigInt(totalSlots), BigInt(durationSeconds)],
      type: "legacy",
      feeCurrency: usdmAddress,
    });
  };

  // Pay out a worker (called by Task Creator or Admin)
  const payoutWorker = async (taskId: string, workerAddress: string) => {
    if (contractAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error(`Escrow contract not configured for chain ID ${chainId}`);
    }

    const bytes32TaskId = formatTaskIdToBytes32(taskId);

    const usdmAddress = getUsdmAddress(chainId);

    return writeContractAsync({
      address: contractAddress,
      abi: ESCROW_ABI,
      functionName: "payoutWorker",
      args: [bytes32TaskId, workerAddress as `0x${string}`],
      type: "legacy",
      feeCurrency: usdmAddress,
    });
  };

  // Refund unused campaign tokens (called by Task Creator after expiry)
  const refundCampaign = async (taskId: string) => {
    if (contractAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error(`Escrow contract not configured for chain ID ${chainId}`);
    }

    const bytes32TaskId = formatTaskIdToBytes32(taskId);

    const usdmAddress = getUsdmAddress(chainId);

    return writeContractAsync({
      address: contractAddress,
      abi: ESCROW_ABI,
      functionName: "refundCampaign",
      args: [bytes32TaskId],
      type: "legacy",
      feeCurrency: usdmAddress,
    });
  };

  return {
    contractAddress,
    createCampaign,
    payoutWorker,
    refundCampaign,
  };
}

// Hook to read a campaign state from the contract
export function useGetCampaignDetails(taskId: string) {
  const chainId = useChainId();
  const contractAddress = getEscrowAddress(chainId);
  const bytes32TaskId = taskId ? formatTaskIdToBytes32(taskId) : ("0x" + "0".repeat(64)) as `0x${string}`;

  return useReadContract({
    address: contractAddress,
    abi: ESCROW_ABI,
    functionName: "campaigns",
    args: [bytes32TaskId],
    query: {
      enabled: !!taskId && contractAddress !== "0x0000000000000000000000000000000000000000",
    }
  });
}
