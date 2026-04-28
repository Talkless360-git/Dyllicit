// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title ChainStreamNFT
 * @dev ERC1155 token for music/video streaming content with EIP-2981 Royalties.
 */
contract ChainStreamNFT is ERC1155, Ownable, ERC1155Burnable, ERC1155Supply, ERC2981, ERC2771Context {
    
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => uint256) public mintPrices; // Price in Wei
    mapping(uint256 => address) public tokenCreators;
    
    uint96 public globalRoyaltyBps = 500; // Default 5%
    
    event NFTMinted(address indexed creator, uint256 tokenId, uint256 amount, string uri);
    event NFTPurchased(address indexed buyer, uint256 tokenId, uint256 price);
    event GlobalRoyaltyUpdated(uint96 newBps);
    event MintPriceUpdated(uint256 tokenId, uint256 price);

    constructor(address initialOwner, address trustedForwarder) ERC1155("") Ownable(initialOwner) ERC2771Context(trustedForwarder) {}

    // ...

    /**
     * @dev Sets the global royalty fee for all future mints. Max 10% (1000 bps).
     */
    function setGlobalRoyalty(uint96 _bps) external onlyOwner {
        require(_bps <= 1000, "Royalty too high");
        globalRoyaltyBps = _bps;
        emit GlobalRoyaltyUpdated(_bps);
    }

    /**
     * @dev Sets the mint price for a specific token ID. Only creator can set.
     */
    function setMintPrice(uint256 id, uint256 price) external {
        require(tokenCreators[id] == msg.sender || owner() == msg.sender, "Not authorized");
        mintPrices[id] = price;
        emit MintPriceUpdated(id, price);
    }

    /**
     * @dev Mint a new piece of content with an optional purchase price.
     * @param account Creator address
     * @param id Token ID
     * @param amount Number of initial copies for the creator
     * @param uri Metadata URI
     * @param royaltyFee Fixed royalty fee in bps
     * @param price Initial purchase price in Wei for future buyers
     */
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        string memory uri,
        uint96 royaltyFee,
        uint256 price
    ) public {
        require(!exists(id), "Token ID already exists");
        require(account != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be > 0");

        _mint(account, id, amount, "");
        _tokenURIs[id] = uri;
        tokenCreators[id] = account;
        mintPrices[id] = price;
        
        uint96 appliedRoyalty = royaltyFee > 0 ? royaltyFee : globalRoyaltyBps;
        
        if (appliedRoyalty > 0) {
            _setTokenRoyalty(id, account, appliedRoyalty);
        }
        
        emit NFTMinted(account, id, amount, uri);
        if (price > 0) emit MintPriceUpdated(id, price);
    }

    /**
     * @dev Purchase/Collect a copy of an existing NFT.
     * @param id The token ID to purchase.
     */
    function purchase(uint256 id) external payable {
        require(exists(id), "Token does not exist");
        uint256 price = mintPrices[id];
        require(price > 0, "Token not for sale");
        require(msg.value >= price, "Insufficient payment");

        address creator = tokenCreators[id];
        
        // Handle Payment Split (97% to Creator, 3% to Admin/Owner by default)
        // We use a fixed 3% for simplicity here, matching platform fee intent
        uint256 adminCut = (msg.value * 300) / 10000;
        uint256 creatorShare = msg.value - adminCut;

        (bool s1, ) = payable(owner()).call{value: adminCut}("");
        (bool s2, ) = payable(creator).call{value: creatorShare}("");
        require(s1 && s2, "Transfer failed");

        // Mint 1 copy to the buyer
        _mint(msg.sender, id, 1, "");
        
        emit NFTPurchased(msg.sender, id, msg.value);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Sets a new URI for a token ID.
     */
    function setURI(uint256 tokenId, string memory newuri) public onlyOwner {
        _tokenURIs[tokenId] = newuri;
    }

    // Required overrides
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

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
