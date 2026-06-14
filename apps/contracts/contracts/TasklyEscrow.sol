// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract TasklyEscrow {
    address public owner;
    IERC20 public stableToken; // Mento Dollar (USDm) or other ERC20 stablecoin

    struct Campaign {
        address advertiser;
        uint256 rewardPerSlot;
        uint256 slotsRemaining;
        uint256 expiry;
        bool refunded;
    }

    // Mapping from hashed taskId (bytes32) to Campaign
    mapping(bytes32 => Campaign) public campaigns;

    event CampaignCreated(
        bytes32 indexed taskId,
        address indexed advertiser,
        uint256 rewardPerSlot,
        uint256 totalSlots,
        uint256 expiry
    );

    event WorkerPaid(
        bytes32 indexed taskId,
        address indexed worker,
        uint256 amount
    );

    event CampaignRefunded(
        bytes32 indexed taskId,
        address indexed advertiser,
        uint256 refundAmount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor(address _stableToken) {
        require(_stableToken != address(0), "Invalid token address");
        owner = msg.sender;
        stableToken = IERC20(_stableToken);
    }

    function createCampaign(
        bytes32 taskId,
        uint256 rewardPerSlot,
        uint256 totalSlots,
        uint256 duration
    ) external {
        require(campaigns[taskId].advertiser == address(0), "Campaign already exists");
        require(rewardPerSlot > 0, "Reward must be greater than zero");
        require(totalSlots > 0, "Slots must be greater than zero");
        require(duration > 0, "Duration must be greater than zero");

        uint256 totalBudget = rewardPerSlot * totalSlots;
        
        // Transfer USDm to contract
        require(
            stableToken.transferFrom(msg.sender, address(this), totalBudget),
            "Escrow deposit failed"
        );

        campaigns[taskId] = Campaign({
            advertiser: msg.sender,
            rewardPerSlot: rewardPerSlot,
            slotsRemaining: totalSlots,
            expiry: block.timestamp + duration,
            refunded: false
        });

        emit CampaignCreated(taskId, msg.sender, rewardPerSlot, totalSlots, block.timestamp + duration);
    }

    function payoutWorker(bytes32 taskId, address worker) external {
        Campaign storage campaign = campaigns[taskId];
        require(campaign.advertiser != address(0), "Campaign does not exist");
        require(campaign.slotsRemaining > 0, "No slots remaining");
        require(!campaign.refunded, "Campaign already refunded");
        
        // Only task advertiser OR the contract owner (admin) can release payment
        require(
            msg.sender == campaign.advertiser || msg.sender == owner,
            "Not authorized to pay"
        );

        campaign.slotsRemaining -= 1;
        uint256 amount = campaign.rewardPerSlot;

        require(
            stableToken.transfer(worker, amount),
            "Worker payout failed"
        );

        emit WorkerPaid(taskId, worker, amount);
    }

    function refundCampaign(bytes32 taskId) external {
        Campaign storage campaign = campaigns[taskId];
        require(campaign.advertiser != address(0), "Campaign does not exist");
        require(!campaign.refunded, "Campaign already refunded");
        require(campaign.slotsRemaining > 0, "No funds to refund");
        require(block.timestamp > campaign.expiry, "Campaign has not expired yet");
        
        // Only campaign creator can claim refund
        require(msg.sender == campaign.advertiser, "Only creator can refund");

        uint256 refundAmount = campaign.rewardPerSlot * campaign.slotsRemaining;
        campaign.slotsRemaining = 0;
        campaign.refunded = true;

        require(
            stableToken.transfer(campaign.advertiser, refundAmount),
            "Refund transfer failed"
        );

        emit CampaignRefunded(taskId, campaign.advertiser, refundAmount);
    }

    function updateOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }
}
