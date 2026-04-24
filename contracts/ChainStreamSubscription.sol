// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ChainStreamSubscription is Ownable, ReentrancyGuard {
    uint256 public subscriptionPrice = 0.01 ether;
    uint256 public subscriptionDuration = 30 days;
    uint256 public platformFeeBps = 250; // 2.5%
    uint256 public constant MAX_BATCH_SIZE = 100;

    mapping(address => uint256) public subscriberExpirations;

    event Subscribed(address indexed user, uint256 newExpiration, uint256 amountPaid);
    event PlatformFeeUpdated(uint256 newBps);
    event PriceUpdated(uint256 newPrice);
    event DurationUpdated(uint256 newDuration);
    event Withdrawn(address indexed to, uint256 amount);
    event RoyaltyPaid(address indexed artist, uint256 amount);
    event RoyaltiesBatchCompleted(uint256 totalArtists, uint256 totalAmount);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Update subscription price. Must be > 0.
     */
    function setPrice(uint256 _price) external onlyOwner {
        require(_price > 0, "Price must be > 0");
        subscriptionPrice = _price;
        emit PriceUpdated(_price);
    }

    /**
     * @dev Update subscription duration.
     */
    function setDuration(uint256 _duration) external onlyOwner {
        require(_duration > 0, "Duration must be > 0");
        subscriptionDuration = _duration;
        emit DurationUpdated(_duration);
    }

    /**
     * @dev Update platform fee. Max 10% (1000 bps).
     */
    function setPlatformFee(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = _bps;
        emit PlatformFeeUpdated(_bps);
    }

    /**
     * @dev Subscribe by sending exact subscription price.
     * Uses Checks-Effects-Interactions pattern + ReentrancyGuard.
     */
    function subscribe() external payable nonReentrant {
        // Checks
        require(msg.value == subscriptionPrice, "Exact payment required");

        // Effects — update state BEFORE external calls
        if (subscriberExpirations[msg.sender] < block.timestamp) {
            subscriberExpirations[msg.sender] = block.timestamp + subscriptionDuration;
        } else {
            subscriberExpirations[msg.sender] += subscriptionDuration;
        }

        emit Subscribed(msg.sender, subscriberExpirations[msg.sender], msg.value);

        // Interactions — external call LAST
        uint256 platformCut = (msg.value * platformFeeBps) / 10000;
        if (platformCut > 0) {
            (bool success, ) = payable(owner()).call{value: platformCut}("");
            require(success, "Platform fee transfer failed");
        }
    }

    /**
     * @dev Withdraw entire contract balance to owner.
     * Uses .call instead of .transfer to avoid 2300 gas limit DoS.
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");

        emit Withdrawn(owner(), balance);
    }

    /**
     * @dev Batch payout royalties to artists.
     * Uses .call instead of .transfer. Capped at MAX_BATCH_SIZE to prevent gas limit DoS.
     */
    function payoutRoyalties(address[] calldata artists, uint256[] calldata amounts) external onlyOwner nonReentrant {
        require(artists.length == amounts.length, "Mismatched arrays");
        require(artists.length > 0, "Empty arrays");
        require(artists.length <= MAX_BATCH_SIZE, "Batch too large");

        uint256 totalPayout = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(artists[i] != address(0), "Invalid artist address");
            require(amounts[i] > 0, "Amount must be > 0");
            totalPayout += amounts[i];
        }
        require(address(this).balance >= totalPayout, "Insufficient contract balance");

        for (uint256 i = 0; i < artists.length; i++) {
            (bool success, ) = payable(artists[i]).call{value: amounts[i]}("");
            require(success, "Payout transfer failed");
            emit RoyaltyPaid(artists[i], amounts[i]);
        }

        emit RoyaltiesBatchCompleted(artists.length, totalPayout);
    }

    /**
     * @dev Check if a user has an active subscription.
     */
    function isSubscribed(address _user) external view returns (bool) {
        return subscriberExpirations[_user] >= block.timestamp;
    }

    /**
     * @dev Allow direct deposits to top up the royalty pool.
     */
    receive() external payable {}
}
