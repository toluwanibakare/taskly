import { NextResponse } from "next/server";
import { createWalletClient, http, publicActions, keccak256, toBytes, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { ESCROW_ABI } from "@/lib/escrowAbi";

const ESCROW_CONTRACT = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS_MAINNET || "0x89ebD3C199456E1C25A42B5D393C6249b1233713") as `0x${string}`;
const USDM_CONTRACT = "0x765DE816845861e75A25fCA122bb6898B8B1282a"; // USDm Celo Mainnet
const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// Match every bytes32 encoding this platform has ever used to create on-chain campaigns
function getRefundCandidates(taskId: string): `0x${string}`[] {
  return [
    keccak256(toBytes(taskId)) as `0x${string}`,
    stringToHex(taskId.slice(0, 31).padEnd(32, "\0")) as `0x${string}`,
  ];
}

// Server-side escrow refund using the platform admin wallet.
// Required for Naira (Korapay) funded campaigns where the on-chain advertiser is the admin
// and the task creator's own wallet cannot call refundCampaign.
export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();
    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }
    if (!PRIVATE_KEY) {
      console.error("ADMIN_PRIVATE_KEY is not configured");
      return NextResponse.json({ error: "Admin key missing" }, { status: 500 });
    }

    const account = privateKeyToAccount(`0x${PRIVATE_KEY.replace(/^0x/, "")}`);
    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http("https://forno.celo.org")
    }).extend(publicActions);

    let lastError: any = null;
    for (const bytes32TaskId of getRefundCandidates(taskId)) {
      try {
        const tx = await walletClient.writeContract({
          address: ESCROW_CONTRACT,
          abi: ESCROW_ABI,
          functionName: "refundCampaign",
          args: [bytes32TaskId],
          type: "legacy",
          feeCurrency: USDM_CONTRACT as `0x${string}`,
        });
        await walletClient.waitForTransactionReceipt({ hash: tx });
        console.log(`Refund executed via admin wallet for task ${taskId}, tx: ${tx}`);
        return NextResponse.json({ success: true, txHash: tx });
      } catch (err: any) {
        lastError = err;
        console.error(`Refund attempt failed for task ${taskId} (encoding ${bytes32TaskId}):`, err?.message || err);
      }
    }

    return NextResponse.json(
      { error: lastError?.message || "Refund failed on-chain" },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("Refund API error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
