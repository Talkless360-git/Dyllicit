// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract ChainStreamSubscription is Ownable, ReentrancyGuard, ERC2771Context {
    uint256 public subscriptionPrice = 0.01 ether;
    uint256 public subscriptionDuration = 30 days;
    uint256 public platformFeeBps = 250; // 2.5%
    uint256 public constant MAX_BATCH_SIZE = 100;
    address public nftContract;

    mapping(address => uint256) public subscriberExpirations;
    mapping(address => uint256) public pendingRoyalties;
    
    // Fractional Royalties
    mapping(uint256 => uint256) public fractionalRoyaltyBps; // tokenId -> bps of royalty for holders
    mapping(uint256 => uint256) public accumulatedPerShare; // tokenId -> total ETH per share
    mapping(uint256 => mapping(address => uint256)) public lastAccumulatedPerShare; // user's last claim snapshot

    event Subscribed(address indexed user, uint256 newExpiration, uint256 amountPaid);
    event PlatformFeeUpdated(uint256 newBps);
    event PriceUpdated(uint256 newPrice);
    event DurationUpdated(uint256 newDuration);
    event Withdrawn(address indexed to, uint256 amount);
    event RoyaltyPaid(address indexed artist, uint256 amount);
    event RoyaltiesAllocated(uint256 totalArtists, uint256 totalAmount);
    event FractionalRoyaltyAllocated(uint256 indexed tokenId, uint256 amount);
    event FractionalRoyaltyClaimed(uint256 indexed tokenId, address indexed user, uint256 amount);
    event FractionalConfigUpdated(uint256 indexed tokenId, uint256 bps);
    event NFTContractUpdated(address newContract);

    constructor(address trustedForwarder) Ownable(_msgSender()) ERC2771Context(trustedForwarder) {}

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
     * @dev Set the NFT contract address.
     */
    function setNFTContract(address _nft) external onlyOwner {
        nftContract = _nft;
        emit NFTContractUpdated(_nft);
    }

    /**
     * @dev Configure fractional royalty for a song.
     */
    function setFractionalConfig(uint256 _tokenId, uint256 _bps) external onlyOwner {
        require(_bps <= 10000, "BPS too high");
        fractionalRoyaltyBps[_tokenId] = _bps;
        emit FractionalConfigUpdated(_tokenId, _bps);
    }

    /**
     * @dev Subscribe by sending exact subscription price.
     * Uses Checks-Effects-Interactions pattern + ReentrancyGuard.
     */
    function subscribe() external payable nonReentrant {
        // Checks
        require(msg.value == subscriptionPrice, "Exact payment required");

        // Effects — update state BEFORE external calls
        if (subscriberExpirations[_msgSender()] < block.timestamp) {
            subscriberExpirations[_msgSender()] = block.timestamp + subscriptionDuration;
        } else {
            subscriberExpirations[_msgSender()] += subscriptionDuration;
        }

        emit Subscribed(_msgSender(), subscriberExpirations[_msgSender()], msg.value);

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
     * @dev Batch allocate royalties to artists.
     * Prevents DoS by using a pull-pattern (Withdrawal Pattern).
     */
    function payoutRoyalties(
        address[] calldata artists, 
        uint256[] calldata amounts,
        uint256[] calldata tokenIds
    ) external onlyOwner nonReentrant {
        require(artists.length == amounts.length && artists.length == tokenIds.length, "Mismatched arrays");
        require(artists.length > 0, "Empty arrays");
        require(artists.length <= MAX_BATCH_SIZE, "Batch too large");

        uint256 totalPayout = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            _allocateRoyalty(artists[i], amounts[i], tokenIds[i]);
            totalPayout += amounts[i];
        }
        
        require(address(this).balance >= totalPayout, "Insufficient contract balance");
        emit RoyaltiesAllocated(artists.length, totalPayout);
    }

    /**
     * @dev Helper to allocate royalty for a single artist/track.
     */
    function _allocateRoyalty(address artist, uint256 amount, uint256 tokenId) private {
        require(artist != address(0), "Invalid artist address");
        require(amount > 0, "Amount must be > 0");

        uint256 bps = fractionalRoyaltyBps[tokenId];
        if (bps > 0 && nftContract != address(0)) {
            uint256 holderShare = (amount * bps) / 10000;
            uint256 artistShare = amount - holderShare;
            
            pendingRoyalties[artist] += artistShare;
            
            (bool success, bytes memory data) = nftContract.staticcall(
                abi.encodeWithSignature("totalSupply(uint256)", tokenId)
            );
            
            if (success) {
                uint256 supply = abi.decode(data, (uint256));
                if (supply > 0) {
                    accumulatedPerShare[tokenId] += (holderShare * 1e18) / supply;
                    emit FractionalRoyaltyAllocated(tokenId, holderShare);
                } else {
                    pendingRoyalties[artist] += holderShare;
                }
            } else {
                pendingRoyalties[artist] += holderShare;
            }
        } else {
            pendingRoyalties[artist] += amount;
        }
    }

    /**
     * @dev Allow NFT holders to claim their fractional royalties.
     */
    function claimFractionalRoyalties(uint256 _tokenId) external nonReentrant {
        require(nftContract != address(0), "NFT contract not set");
        
        // Get user balance
        (bool success, bytes memory data) = nftContract.staticcall(
            abi.encodeWithSignature("balanceOf(address,uint256)", _msgSender(), _tokenId)
        );
        require(success, "Failed to fetch balance");
        uint256 balance = abi.decode(data, (uint256));
        require(balance > 0, "No shares held");

        uint256 accumulated = accumulatedPerShare[_tokenId];
        uint256 lastAccum = lastAccumulatedPerShare[_tokenId][_msgSender()];
        require(accumulated > lastAccum, "No new royalties");

        uint256 claimable = (balance * (accumulated - lastAccum)) / 1e18;
        require(claimable > 0, "Claimable too small");

        lastAccumulatedPerShare[_tokenId][_msgSender()] = accumulated;

        (bool s, ) = payable(_msgSender()).call{value: claimable}("");
        require(s, "Transfer failed");

        emit FractionalRoyaltyClaimed(_tokenId, _msgSender(), claimable);
    }

    /**
     * @dev Allow artists to withdraw their accumulated royalties.
     */
    function withdrawRoyalties() external nonReentrant {
        uint256 amount = pendingRoyalties[_msgSender()];
        require(amount > 0, "No royalties to withdraw");

        pendingRoyalties[_msgSender()] = 0;

        (bool success, ) = payable(_msgSender()).call{value: amount}("");
        require(success, "Transfer failed");

        emit RoyaltyPaid(_msgSender(), amount);
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

    function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength() internal view override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }
}
