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
    
    uint96 public globalRoyaltyBps = 500; // Default 5%
    
    event NFTMinted(address indexed creator, uint256 tokenId, uint256 amount, string uri);
    event GlobalRoyaltyUpdated(uint96 newBps);

    constructor(address initialOwner, address trustedForwarder) ERC1155("") Ownable(initialOwner) ERC2771Context(trustedForwarder) {}

    /**
     * @dev Sets the global royalty fee for all future mints. Max 10% (1000 bps).
     */
    function setGlobalRoyalty(uint96 _bps) external onlyOwner {
        require(_bps <= 1000, "Royalty too high");
        globalRoyaltyBps = _bps;
        emit GlobalRoyaltyUpdated(_bps);
    }

    /**
     * @dev Mint a new piece of content. Reverts if token ID already exists.
     * @param account Creator address
     * @param id Token ID (generated on frontend/backend)
     * @param amount Number of copies (1 for unique, 100 for open edition)
     * @param uri Metadata URI (IPFS)
     * @param royaltyFee Fixed royalty fee in basis points. If 0, uses global default.
     */
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        string memory uri,
        uint96 royaltyFee
    ) public {
        require(!exists(id), "Token ID already exists");
        require(account != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be > 0");

        _mint(account, id, amount, "");
        _tokenURIs[id] = uri;
        
        uint96 appliedRoyalty = royaltyFee > 0 ? royaltyFee : globalRoyaltyBps;
        
        if (appliedRoyalty > 0) {
            _setTokenRoyalty(id, account, appliedRoyalty);
        }
        
        emit NFTMinted(account, id, amount, uri);
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
