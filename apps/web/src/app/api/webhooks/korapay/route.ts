import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { 
  createWalletClient, 
  http, 
  publicActions, 
  parseEther, 
  stringToHex 
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { ESCROW_ABI } from "@/lib/escrowAbi";

// ERC20 Minimal ABI for approve
const ERC20_ABI = [
  {
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const ESCROW_CONTRACT = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS_MAINNET || "0x2e18C5b4427637e827eE02329DC1eE90B27290dE") as `0x${string}`;
const CUSD_CONTRACT = "0x765DE816845861e75A25fCA122bb6898B8B1282a"; // cUSD Celo Mainnet
const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY;

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-korapay-signature");

    if (!signature) {
      console.warn("Missing x-korapay-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    if (!KORAPAY_SECRET_KEY) {
      console.error("KORAPAY_SECRET_KEY is not configured");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    // Verify webhook signature
    const bodyObj = JSON.parse(rawBody);
    
    // Korapay signatures can be computed on the entire raw body or just the data object.
    // We compute both to guarantee compatibility across environments.
    const signatureRaw = crypto
      .createHmac("sha256", KORAPAY_SECRET_KEY)
      .update(rawBody)
      .digest("hex");
      
    const signatureData = crypto
      .createHmac("sha256", KORAPAY_SECRET_KEY)
      .update(JSON.stringify(bodyObj.data))
      .digest("hex");

    const isValid = (signature === signatureRaw) || (signature === signatureData);

    if (!isValid) {
      console.warn(
        `Invalid webhook signature. Received: ${signature}, Expected (raw): ${signatureRaw}, Expected (data): ${signatureData}`
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { event, data } = bodyObj;
    console.log(`Received Korapay webhook event: ${event}`, data);

    // We only process successful charge events
    if (event !== "charge.success" || data.status !== "success") {
      console.log(`Skipping event type: ${event} status: ${data.status}`);
      return NextResponse.json({ status: "ignored" });
    }

    const transactionReference = data.reference;
    if (!transactionReference) {
      console.error("No reference found in payload data");
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }
    const taskId = transactionReference.split("_")[0];

    // Fetch the task from Firestore
    const taskRef = doc(db, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);

    if (!taskSnap.exists()) {
      console.error(`Task ${taskId} not found in Firestore`);
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskData = taskSnap.data();
    if (taskData.status !== "pending_payment") {
      console.log(`Task ${taskId} is not in pending_payment status (status: ${taskData.status})`);
      return NextResponse.json({ status: "already_processed" });
    }

    if (!PRIVATE_KEY) {
      console.error("ADMIN_PRIVATE_KEY is not configured");
      return NextResponse.json({ error: "Admin key missing" }, { status: 500 });
    }

    // Setup Viem Client with Admin account
    const account = privateKeyToAccount(`0x${PRIVATE_KEY.replace(/^0x/, "")}`);
    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http("https://forno.celo.org")
    }).extend(publicActions);

    console.log(`Initiating on-chain campaign funding for task ${taskId} from admin ${account.address}`);

    const payoutValue = parseFloat(taskData.amount.replace(/[^\d.]/g, "")) / taskData.slotsTotal;
    const amountWei = parseEther(parseFloat(taskData.amount.replace(/[^\d.]/g, "")).toFixed(18));
    const rewardWei = parseEther(payoutValue.toFixed(18));
    const bytes32TaskId = stringToHex(taskId.slice(0, 31).padEnd(32, "\0")) as `0x${string}`;
    const durationSeconds = BigInt((taskData.expiryHours || 24) * 3600);

    // Step 1: Approve Escrow Contract to spend cUSD
    console.log(`Approving cUSD spend of ${taskData.amount} for Escrow contract...`);
    const approveTx = await walletClient.writeContract({
      address: CUSD_CONTRACT as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ESCROW_CONTRACT, amountWei],
      type: "legacy"
    });
    console.log(`Approve Tx sent: ${approveTx}. Waiting for confirmation...`);
    await walletClient.waitForTransactionReceipt({ hash: approveTx });

    // Step 2: Call createCampaign
    console.log(`Calling createCampaign on-chain...`);
    const createTx = await walletClient.writeContract({
      address: ESCROW_CONTRACT,
      abi: ESCROW_ABI,
      functionName: "createCampaign",
      args: [bytes32TaskId, rewardWei, BigInt(taskData.slotsTotal), durationSeconds],
      type: "legacy"
    });
    console.log(`Create Campaign Tx sent: ${createTx}. Waiting for confirmation...`);
    await walletClient.waitForTransactionReceipt({ hash: createTx });

    // Step 3: Update Firestore document
    await updateDoc(taskRef, {
      status: "active",
      txHash: createTx,
      paymentMethod: "naira_automated",
      activatedAt: new Date().toISOString()
    });

    console.log(`Task ${taskId} successfully funded and activated!`);
    return NextResponse.json({ status: "success", txHash: createTx });

  } catch (err: any) {
    console.error("Error processing webhook:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
