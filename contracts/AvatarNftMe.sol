// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

//////////////////////
// Import statements
//////////////////////
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

//////////////////////
// libraries
//////////////////////
import {OracleLib, AggregatorV3Interface} from "./libraries/OracleLib.sol";

//////////////////////
// errors
//////////////////////
error AvatarNftMe__NeedMoreETHSent();
error AvatarNftMe__TransferFailed();
error NftAvatarMe__NeedsMoreThanZero();
error NftAvatarMe__TokenNotAllowed(address);
error AvatarNftMe__TokenAddressesAndPriceFeedAddressesAmountsDontMatch();

/**
 * @title An Avatar NFT contract
 * @author Mahith Chigurupati
 * @notice This contract is for creating a personalized NFT
 *
 * Bored of buying Random PPF NFT art generated programatically by artists for huge chunk of money?
 * Ever thought of creating your own PPF NFT that resembles you?
 * Here you go ------------------>
 * This Avatar NFT Me Contract lets anyone create their own personalized NFT,
 * ideally by passing their personal info for metadata and an Avatar version of their image
 * Images will be generated using a third party WEB 2 SDK or API like Ready Player Me etc.,
 *
 * @custom:note - mint NFT for as low as 50 USD, however price of minting an NFT goes up by 50 USD for every 50 NFT's minted.
 * So, what are you waiting for. HURRY! Get your digital version for as low as 50 USD ASAP
 *
 * @custom:restrictions - You can pay using either base currency of chain (eg: ETH for ethereum, MATIC for Polygon etc.,)
 * or any of the supported ERC20 tokens to mint your Avatar NFT
 *
 * @custom:important - Incase you are planning to pay using ERC20 tokens as mint fee,
 * make sure to approve this contract's address to spend your tokens equivalent to current price of minting an NFT
 *
 * Incase, you are planning to use UI (which is the recommended way), you will automatically be asked for an approval transaction before an NFT minting transaction
 *
 * you can find the current price of minting an NFT in USD by calling
 * you can find the current price of minting an NFT in terms of base chain currency or a token by calling
 * you can verify the official webpage to interact with this contract by calling
 *
 * @dev This implements price feeds as our library
 */
contract AvatarNftMe is ERC721, Ownable {
    //////////////////////
    // Type Declarations
    //////////////////////
    using OracleLib for AggregatorV3Interface;

    //////////////////////
    // State variables
    //////////////////////
    uint256 private s_initialPrice;
    uint256 private s_incrementThreshold;
    uint256 private s_mintFee;
    uint256 private s_tokenCounter;
    string private s_contractUri;
    string private s_webPageUri;
    mapping(uint256 tokenId => string tokenUri) private s_tokenIdToUri;
    mapping(address token => address priceFeed) private s_priceFeeds;
    address private s_currentChainPriceFeed;

    //////////////////////
    // Events to emit
    //////////////////////
    event NftMinted(address indexed minter, uint256 indexed nftId);
    event mintFeeTransferedToOwner(uint256 mintFee);
    event mintFeeIncremented(uint256 indexed newMintFee);
    event contractUriUpdated();
    event officialWebpageUriUpdated(string indexed);

    ///////////////////
    // Modifiers
    ///////////////////
    modifier moreThanZero(uint256 amount) {
        if (amount == 0) {
            revert NftAvatarMe__NeedsMoreThanZero();
        }
        _;
    }

    modifier isAllowedToken(address token) {
        if (s_priceFeeds[token] == address(0)) {
            revert NftAvatarMe__TokenNotAllowed(token);
        }
        _;
    }

    ///////////////////
    // Functions
    ///////////////////

    /**
     *
     * @param _tokenAddresses: list of supported token addresses on current chain
     * @param _priceFeedAddresses: list of chainlink price feed contract addresses for supported ERC20 tokens
     * @param _priceFeedAddressOfcurrentChain: chainlink price feed contract address of current chain
     * @param _initialPrice: initial price or start price of NFT
     * @param _incrementThreshold: threshold at which price of NFT should double
     *
     * Token Name: Avatar NFT Me
     * Token Symbol: ANME
     */
    constructor(
        address[] memory _tokenAddresses,
        address[] memory _priceFeedAddresses,
        address _priceFeedAddressOfcurrentChain,
        uint256 _initialPrice,
        uint256 _incrementThreshold
    ) ERC721("Avatar NFT Me", "ANME") {
        if (_tokenAddresses.length != _priceFeedAddresses.length) {
            revert AvatarNftMe__TokenAddressesAndPriceFeedAddressesAmountsDontMatch();
        }

        // These feeds will be the USD pairs
        // For example wETH / USD or wBTC / USD or MATIC / USD or USDC / USD etc.,
        for (uint256 i = 0; i < _tokenAddresses.length; i++) {
            s_priceFeeds[_tokenAddresses[i]] = _priceFeedAddresses[i];
        }

        s_currentChainPriceFeed = _priceFeedAddressOfcurrentChain;

        s_initialPrice = _initialPrice;
        s_mintFee = s_initialPrice;
        s_incrementThreshold = _incrementThreshold;

        s_tokenCounter = 1;
    }

    /////////////////////////
    // external functions
    /////////////////////////

    /**
     * a function called to set contract level metadata
     * ideally called right after deployment of contract
     *
     * Requirement:
     *   can only be called by owner of contract
     *
     * @param _description: a brief about Avatar NFT Me Contract
     * @param _image: collection's home image/icon
     * @param _link: contract's external webpage
     */
    function setContractURI(string memory _description, string memory _image, string memory _link) external onlyOwner {
        emit contractUriUpdated();

        s_contractUri = string(
            abi.encodePacked(
                _baseURI(),
                Base64.encode(
                    bytes(
                        abi.encodePacked(
                            '{"name": "',
                            name(),
                            '", "description": "',
                            _description,
                            '", "image": "',
                            _image,
                            '", "external_link": "',
                            _link,
                            '", "fee_recipient": "',
                            Strings.toHexString(owner()),
                            '"}'
                        )
                    )
                )
            )
        );
    }

    /**
     * a function called only by owner of contract to set the current webpage URI for users to interact with contract using UI
     * ideally called right after deployment of contract and can also be updated later if webpage url changes
     *
     * @param _webPageUri: webpage URL where UI is live
     */
    function setCurrentWebPageUri(string memory _webPageUri) external onlyOwner {
        emit officialWebpageUriUpdated(_webPageUri);
        s_webPageUri = _webPageUri;
    }

    /**
     * a function to form a custom token URI based on following parameters and mint the token to a user's wallet
     * Note: This function will be called only if user intended to mint NFT using chains Base currency
     *
     * @param _firstName: first name of the person
     * @param _lastName: last name of the person
     *
     * @param _bodyType: metadata for NFT image that represents _bodyType
     * @param _outfitGender: metadata for NFT image that represents _outfitVersion
     * @param _skinTone: metadata for NFT image that represents _skinTone
     * @param _createdAt: metadata for NFT image that represents _createdAt
     *
     * @param _imageURI: metadata for NFT image that represents _imageURI
     */
    function formTokenUriAndMint(
        // personal info to include in metadata
        string memory _firstName,
        string memory _lastName,
        string memory _website,
        // NFT image metadata
        string memory _bodyType,
        string memory _outfitGender,
        string memory _skinTone,
        string memory _createdAt,
        // image web link
        string memory _imageURI
    ) external payable {
        // call external view function -> getEthAmountFromUsd from by passing usd in X * 10 ** 18 format
        // which gives us X usd equivalent eth
        // multiply resultant eth by 10 ** 8 and pass as msg.value to formTokenUriAndMintWithEth( /** params */ )
        //
        // Note: Round the Eth equivalent USD to nearest 0 and send it as msg.value
        //
        // formTokenUriAndMintWithEth( {msg.value}, /** params */ ) will call
        // getConversionRate in PriceConverter library by passing eth to get usd equivalent

        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_currentChainPriceFeed);

        // a check to see if correct amount of funds are sent to mint an NFT
        if (priceFeed.getUsdValue(msg.value) < s_mintFee) {
            revert AvatarNftMe__NeedMoreETHSent();
        }

        if (s_tokenCounter % s_incrementThreshold == 0) {
            _updatePrice();
        }

        // calling a formTokenURI to form a custom URI for the token
        string memory uri =
            _formTokenURI(_firstName, _lastName, _website, _bodyType, _outfitGender, _skinTone, _createdAt, _imageURI);

        // transfer mint fee in base currency to the owner/creator of contract
        _transferMintFee(msg.value);

        // minting the token to users wallet with custom URI
        _mint(uri);
    }

    /**
     * a function to form a custom token URI based on following parameters and mint the token to a user's wallet
     * Note: This function will be called only if user intended to mint NFT using supported ERC 20 tokens
     *
     * @param _firstName: first name of the person
     * @param _lastName: last name of the person
     *
     * @param _bodyType: metadata for NFT image that represents _bodyType
     * @param _outfitGender: metadata for NFT image that represents _outfitGender
     * @param _skinTone: metadata for NFT image that represents _skinTone
     * @param _createdAt: metadata for NFT image that represents _createdAt
     *
     * @param _imageURI: metadata for NFT image that represents _imageURI
     */
    function formTokenUriAndMintWithToken(
        // token details
        address _tokenAddress,
        uint256 _amount,
        // personal info to include in metadata
        string memory _firstName,
        string memory _lastName,
        string memory _website,
        // NFT image metadata
        string memory _bodyType,
        string memory _outfitGender,
        string memory _skinTone,
        string memory _createdAt,
        // image web link
        string memory _imageURI
    ) external moreThanZero(_amount) isAllowedToken(_tokenAddress) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_priceFeeds[_tokenAddress]);

        // a check to see if correct amount of funds are sent to mint an NFT
        if (priceFeed.getUsdValue(_amount) < s_mintFee) {
            revert AvatarNftMe__NeedMoreETHSent();
        }

        if (s_tokenCounter % s_incrementThreshold == 0) {
            _updatePrice();
        }

        // calling a formTokenURI to form a custom URI for the token
        string memory uri =
            _formTokenURI(_firstName, _lastName, _website, _bodyType, _outfitGender, _skinTone, _createdAt, _imageURI);

        // transfer mint fee as supported tokens to owner/creator of contract
        _transferMintFeeWithTokens(_tokenAddress, _amount);

        // minting the token to users wallet with custom URI
        _mint(uri);
    }

    /**
     * a function called by owner of contract to add support of buying NFT in other tokens
     *
     * @param _tokenAddress: address of token contract
     * @param _tokenPriceFeedAddress: pricefeed address of token address being addded
     */
    function addTokenSupport(address _tokenAddress, address _tokenPriceFeedAddress) external onlyOwner {
        s_priceFeeds[_tokenAddress] = _tokenPriceFeedAddress;
    }

    //////////////////////////
    // internal functions
    //////////////////////////

    /**
     * a function called to get current price
     * @notice price of NFT increases by 50 USD for every 50 tokens minted
     */
    function _updatePrice() internal {
        emit mintFeeIncremented(s_mintFee);
        s_mintFee += s_initialPrice;
    }

    /**
     * an internal function that defines base uri of a token
     */
    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    /**
     * an internal function called to transfer funds to owner when sent by users to mint an NFT
     *
     */
    function _transferMintFee(uint256 _amount) internal {
        emit mintFeeTransferedToOwner(_amount);

        (bool success,) = payable(owner()).call{value: _amount}("");

        if (!success) {
            revert AvatarNftMe__TransferFailed();
        }
    }

    /**
     * an internal function called to transfer funds to owner when sent by users to mint an NFT
     *
     * @custom:note - user must approve this contract to spend his tokens equivalent to mint fee,
     * if not transaction will fail
     */
    function _transferMintFeeWithTokens(address _tokenAddress, uint256 _amount) internal {
        emit mintFeeTransferedToOwner(_amount);

        bool success = IERC20(_tokenAddress).transferFrom(msg.sender, payable(owner()), _amount);
        if (!success) {
            revert AvatarNftMe__TransferFailed();
        }
    }

    /**
     *
     * @param _firstName: first name of the person
     * @param _lastName: last name of the person
     *
     * @param _bodyType: metadata for NFT image that represents _bodyType
     * @param _outfitGender: metadata for NFT image that represents _outfitGender
     * @param _skinTone: metadata for NFT image that represents _skinTone
     * @param _createdAt: metadata for NFT image that represents _createdAt
     *
     * @param _imageURI: metadata for NFT image that represents _imageURI
     */
    function _formTokenURI(
        string memory _firstName,
        string memory _lastName,
        string memory _website,
        string memory _bodyType,
        string memory _outfitGender,
        string memory _skinTone,
        string memory _createdAt,
        string memory _imageURI
    ) internal view returns (string memory) {
        string memory customUri = string(
            abi.encodePacked(
                _baseURI(),
                Base64.encode(
                    bytes(
                        abi.encodePacked(
                            '{"name": "',
                            string.concat(symbol(), " #", Strings.toString(s_tokenCounter), " of ", _firstName),
                            '","first_name": "',
                            _firstName,
                            '","last_name": "',
                            _lastName,
                            '", "external_url": "',
                            _website,
                            '","description": "An NFT that represents the Avatar of ',
                            _firstName,
                            '", "attributes": ',
                            '[ { "trait_type": ',
                            '"skinTone",',
                            '"value": "',
                            _skinTone,
                            '"},',
                            '{"trait_type": ',
                            '"bodyType",',
                            '"value": "',
                            _bodyType,
                            '"},',
                            '{"trait_type": ',
                            '"outfitGender",',
                            '"value": "',
                            _outfitGender,
                            '"}]',
                            ', "image": "',
                            _imageURI,
                            '","created_at": "',
                            _createdAt,
                            '"}'
                        )
                    )
                )
            )
        );

        return customUri;
    }

    /**
     * An internal function called to mint NFT
     * @param _tokenUri: custom token URI for NFT
     */
    function _mint(string memory _tokenUri) internal {
        s_tokenIdToUri[s_tokenCounter] = _tokenUri;

        emit NftMinted(msg.sender, s_tokenCounter);

        _safeMint(msg.sender, s_tokenCounter);

        s_tokenCounter += 1;
    }

    //////////////////////////////
    // pure and view function
    /////////////////////////////

    /**
     * a function called to view contract level metadata
     */
    function contractURI() external view returns (string memory) {
        return s_contractUri;
    }

    /**
     * a function to get the cost of minting NFT
     */
    function getInitialPrice() external view returns (uint256) {
        return s_initialPrice;
    }

    /**
     * a function to get the threshold at which price increment takes place
     */
    function getIncrementThreshold() external view returns (uint256) {
        return s_incrementThreshold;
    }

    /**
     * a function to get the cost of minting NFT
     */
    function getMintFee() external view returns (uint256) {
        return s_mintFee;
    }

    /**
     * a function call to return current chain price feed address
     */
    function getNativeChainPriceFeed() external view returns (address) {
        return s_currentChainPriceFeed;
    }

    /**
     * a function called to get price feed address of a token
     *
     * @param _token: token for which price feed address is needed
     */
    function getTokenPriceFeed(address _token) external view returns (address) {
        return s_priceFeeds[_token];
    }

    /**
     * a function called to get usd price in eth
     */
    function getEthPriceFromUsd() external view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_currentChainPriceFeed);
        return priceFeed.getEthAmountFromUsd(s_mintFee);
    }

    /**
     * a function to get price conversion from USD to token equivalent price
     *
     * @param _tokenAddress: conversion in which token equivalent is needed
     */
    function getTokenPriceFromUsd(address _tokenAddress) external view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_priceFeeds[_tokenAddress]);
        return priceFeed.getEthAmountFromUsd(s_mintFee);
    }

    /**
     * a function call to return current UI webpage URI to interact with contract
     *
     * @custom:warning - make sure to use only this particular URI to access the Avatar NFT Me contract
     */
    function getCurrentWebPageUri() external view returns (string memory) {
        return s_webPageUri;
    }

    /**
     * a function called to get the token URI of a token minted
     * @param _tokenId: ID for ERC721 token minted
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        return s_tokenIdToUri[_tokenId];
    }

    /**
     * a function to get the number of tokens minted/ current token count
     */
    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
