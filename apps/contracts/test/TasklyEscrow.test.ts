import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";

describe("TasklyEscrow", function () {
  let escrow: any;
  let token: any;
  let owner: any;
  let advertiser: any;
  let worker: any;
  let otherUser: any;
  const taskId = ethers.encodeBytes32String("task-123");
  const rewardPerSlot = ethers.parseEther("1.5");
  const totalSlots = 10;
  const duration = 86400; // 1 day

  beforeEach(async function () {
    [owner, advertiser, worker, otherUser] = await ethers.getSigners();

    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    token = await MockTokenFactory.deploy(ethers.parseEther("1000"));

    const TasklyEscrowFactory = await ethers.getContractFactory("TasklyEscrow");
    escrow = await TasklyEscrowFactory.deploy(await token.getAddress());

    // Send some tokens to advertiser
    await token.transfer(advertiser.address, ethers.parseEther("100"));
  });

  describe("Deployment", function () {
    it("should set the correct owner and token address", async function () {
      expect(await escrow.owner()).to.equal(owner.address);
      expect(await escrow.stableToken()).to.equal(await token.getAddress());
    });
  });

  describe("createCampaign", function () {
    it("should lock tokens, send fee to owner, and create campaign", async function () {
      const budget = rewardPerSlot * BigInt(totalSlots);
      const fee = (budget * 2n) / 100n;
      const total = budget + fee;
      
      // Advertiser approves escrow contract for budget + fee
      await token.connect(advertiser).approve(await escrow.getAddress(), total);

      const initialOwnerBalance = await token.balanceOf(owner.address);

      // Create campaign
      await expect(escrow.connect(advertiser).createCampaign(taskId, rewardPerSlot, totalSlots, duration))
        .to.emit(escrow, "CampaignCreated");
      
      const campaign = await escrow.campaigns(taskId);
      expect(campaign.advertiser).to.equal(advertiser.address);
      expect(campaign.rewardPerSlot).to.equal(rewardPerSlot);
      expect(campaign.slotsRemaining).to.equal(totalSlots);
      expect(campaign.refunded).to.be.false;

      // Contract should hold exactly the budget (fee was sent out)
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(budget);

      // Owner should have received the fee immediately
      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance + fee);
    });
  });

  describe("payoutWorker", function () {
    beforeEach(async function () {
      const budget = rewardPerSlot * BigInt(totalSlots);
      const fee = (budget * 2n) / 100n;
      const total = budget + fee;
      await token.connect(advertiser).approve(await escrow.getAddress(), total);
      await escrow.connect(advertiser).createCampaign(taskId, rewardPerSlot, totalSlots, duration);
    });

    it("should allow advertiser to payout worker", async function () {
      const initialWorkerBalance = await token.balanceOf(worker.address);

      await expect(escrow.connect(advertiser).payoutWorker(taskId, worker.address))
        .to.emit(escrow, "WorkerPaid")
        .withArgs(taskId, worker.address, rewardPerSlot);

      expect(await token.balanceOf(worker.address)).to.equal(initialWorkerBalance + rewardPerSlot);
      
      const campaign = await escrow.campaigns(taskId);
      expect(campaign.slotsRemaining).to.equal(totalSlots - 1);
    });

    it("should allow platform admin (owner) to payout worker", async function () {
      const initialWorkerBalance = await token.balanceOf(worker.address);

      await expect(escrow.connect(owner).payoutWorker(taskId, worker.address))
        .to.emit(escrow, "WorkerPaid")
        .withArgs(taskId, worker.address, rewardPerSlot);

      expect(await token.balanceOf(worker.address)).to.equal(initialWorkerBalance + rewardPerSlot);
    });

    it("should reject payout from non-authorized address", async function () {
      await expect(escrow.connect(otherUser).payoutWorker(taskId, worker.address))
        .to.be.revertedWith("Not authorized to pay");
    });
  });

  describe("refundCampaign", function () {
    beforeEach(async function () {
      const budget = rewardPerSlot * BigInt(totalSlots);
      const fee = (budget * 2n) / 100n;
      const total = budget + fee;
      await token.connect(advertiser).approve(await escrow.getAddress(), total);
      await escrow.connect(advertiser).createCampaign(taskId, rewardPerSlot, totalSlots, duration);
    });

    it("should reject refund before expiry", async function () {
      await expect(escrow.connect(advertiser).refundCampaign(taskId))
        .to.be.revertedWith("Campaign has not expired yet");
    });

    it("should allow creator to refund remaining slots after expiry", async function () {
      // Fast forward time
      await time.increase(duration + 1);

      const initialAdvertiserBalance = await token.balanceOf(advertiser.address);
      const expectedRefund = rewardPerSlot * BigInt(totalSlots);

      await expect(escrow.connect(advertiser).refundCampaign(taskId))
        .to.emit(escrow, "CampaignRefunded")
        .withArgs(taskId, advertiser.address, expectedRefund);

      expect(await token.balanceOf(advertiser.address)).to.equal(initialAdvertiserBalance + expectedRefund);
      
      const campaign = await escrow.campaigns(taskId);
      expect(campaign.slotsRemaining).to.equal(0);
      expect(campaign.refunded).to.be.true;
    });
  });
});
