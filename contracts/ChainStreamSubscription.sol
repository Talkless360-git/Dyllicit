// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ChainStreamSubscription is Ownable {
    uint256 public subscriptionPrice = 0.01 ether;
    uint256 public subscriptionDuration = 30 days;
    uint256 public platformFeeBps = 250; // 2.5%

    mapping(address => uint256) public subscriberExpirations;

    event Subscribed(address indexed user, uint256 newExpiration, uint256 amountPaid);
    event PlatformFeeUpdated(uint256 newBps);

    constructor() Ownable(msg.sender) {}

    function setPrice(uint256 _price) external onlyOwner {
        subscriptionPrice = _price;
    }

    function setPlatformFee(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = _bps;
        emit PlatformFeeUpdated(_bps);
    }

    function subscribe() external payable {
        require(msg.value >= subscriptionPrice, "Insufficient payment");

        // Split fee: send platform cut to owner immediately
        uint256 platformCut = (msg.value * platformFeeBps) / 10000;
        if (platformCut > 0) {
            payable(owner()).transfer(platformCut);
        }

        if (subscriberExpirations[msg.sender] < block.timestamp) {
            subscriberExpirations[msg.sender] = block.timestamp + subscriptionDuration;
        } else {
            subscriberExpirations[msg.sender] += subscriptionDuration;
        }

        emit Subscribed(msg.sender, subscriberExpirations[msg.sender], msg.value);
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function payoutRoyalties(address[] calldata artists, uint256[] calldata amounts) external onlyOwner {
        require(artists.length == amounts.length, "Mismatched arrays");
        uint256 totalPayout = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalPayout += amounts[i];
        }
        require(address(this).balance >= totalPayout, "Insufficient contract balance");

        for (uint256 i = 0; i < artists.length; i++) {
            payable(artists[i]).transfer(amounts[i]);
        }
    }

    function isSubscribed(address _user) external view returns (bool) {
        return subscriberExpirations[_user] >= block.timestamp;
    }
}
