// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * @title ChainStreamNFT
 * @dev ERC1155 token for music/video streaming content with EIP-2981 Royalties.
 */
contract ChainStreamNFT is ERC1155, Ownable, ERC1155Burnable, ERC1155Supply, ERC2981 {
    
    mapping(uint256 => string) private _tokenURIs;
    
    event NFTMinted(address indexed creator, uint256 tokenId, uint256 amount, string uri);

    constructor(address initialOwner) ERC1155("") Ownable(initialOwner) {}

    /**
     * @dev Mint a new piece of content. Reverts if token ID already exists.
     * @param account Creator address
     * @param id Token ID (generated on frontend/backend)
     * @param amount Number of copies (1 for unique, 100 for open edition)
     * @param uri Metadata URI (IPFS)
     * @param royaltyFee Fixed royalty fee in basis points (e.g. 500 = 5%)
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
        
        if (royaltyFee > 0) {
            _setTokenRoyalty(id, account, royaltyFee);
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
}
