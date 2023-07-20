import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { network, deployments, ethers } from "hardhat"
import {
    developmentChains,
    AGGREGATOR_INITIAL_PRICE,
    INITIAL_MINT_FEE,
    INCREMENT_THRESHOLD,
    ONE,
    LOW_MINT_FEE,
    SEND_MINT_FEE,
} from "../../helper-hardhat-config"
import {
    AvatarNftMe,
    MockV3Aggregator,
    MockWethToken,
    MockWbtcToken,
    MockUsdcToken,
} from "../../typechain-types"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("AvatarNFTMe", function () {
          let avatarNftMe: AvatarNftMe
          let mockV3Aggregator: MockV3Aggregator
          let wethTokenAddress: MockWethToken
          let wbtcTokenAddress: MockWbtcToken
          let usdcTokenAddress: MockUsdcToken
          let deployer: SignerWithAddress
          let user: SignerWithAddress

          const NAME = "Avatar NFT Me"
          const SYMBOL = "ANME"
          const WEBPAGE_URI = "https://www.avatarNFT.me"
          const DESCRIPTION =
              "Avatar NFT Me is a collection of 10,000 unique avatars living on the Ethereum blockchain."
          const IMAGE = "https://www.avatarNFT.me/image.png"
          const LINK = "https://www.avatarNFT.me"

          const FIRST_NAME = "John"
          const LAST_NAME = "Doe"
          const WEBSITE = "https://www.avatarNFT.me"
          const BODY_TYPE = "Regular"
          const OUTFIT_GENDER = "Male"
          const SKIN_TONE = "Light"
          const CREATED_AT = "2021-08-01T00:00:00.000Z"
          const IMAGE_URI = "https://www.avatarNFT.me/image.png"

          const UNSUPPORTED_TOKEN_ADDRESS =
              "0xdD2FD4581271e230360230F9337D5c0430Bf44C0"
          const dummyToken = "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E"
          const dummyTokenPriceFeed =
              "0xdD2FD4581271e230360230F9337D5c0430Bf44C0"

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              user = accounts[1]

              await deployments.fixture(["all"])
              avatarNftMe = await ethers.getContract("AvatarNftMe", deployer)

              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )

              wethTokenAddress = await ethers.getContract(
                  "MockWethToken",
                  deployer
              )

              wbtcTokenAddress = await ethers.getContract(
                  "MockWbtcToken",
                  deployer
              )
              usdcTokenAddress = await ethers.getContract(
                  "MockUsdcToken",
                  deployer
              )
          })

          describe("constructor", function () {
              it("sets the owner addresses correctly", async () => {
                  const response = await avatarNftMe.owner()
                  assert.equal(response, deployer.address)
              })
              it("sets the NFT Name correctly", async () => {
                  const response = await avatarNftMe.name()
                  assert.equal(response, NAME)
              })

              it("sets the NFT Symbol correctly", async () => {
                  const response = await avatarNftMe.symbol()
                  assert.equal(response, SYMBOL)
              })

              it("sets the ETH / USD address correctly", async () => {
                  const response = await avatarNftMe.getTokenPriceFeed(
                      wethTokenAddress
                  )
                  assert.equal(response, mockV3Aggregator.target)
              })

              it("sets the BTC / USD price feed address correctly", async () => {
                  const response = await avatarNftMe.getTokenPriceFeed(
                      wbtcTokenAddress
                  )
                  assert.equal(response, mockV3Aggregator.target)
              })

              it("sets the USDC / USD price feed address correctly", async () => {
                  const response = await avatarNftMe.getTokenPriceFeed(
                      usdcTokenAddress
                  )
                  assert.equal(response, mockV3Aggregator.target)
              })

              it("sets the native chain aggregator address correctly", async () => {
                  const response = await avatarNftMe.getNativeChainPriceFeed()
                  assert.equal(response, mockV3Aggregator.target)
              })
          })

          describe("Contract Level Metdata", function () {
              it("sets the webpage correctly", async () => {
                  const tx = avatarNftMe.setCurrentWebPageUri(WEBPAGE_URI)
                  await expect(tx)
                      .to.emit(avatarNftMe, "officialWebpageUriUpdated")
                      .withArgs(WEBPAGE_URI)

                  const response = await avatarNftMe.getCurrentWebPageUri()
                  assert.equal(response, WEBPAGE_URI)
              })

              it("revert the set webpage correctly for non owner", async () => {
                  const tx = avatarNftMe
                      .connect(user)
                      .setCurrentWebPageUri(WEBPAGE_URI)

                  await expect(tx).to.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })

              it("sets the Contract URI correctly", async () => {
                  const contractName = await avatarNftMe.name()

                  const base64EncodedJson = `data:application/json;base64,${Buffer.from(
                      JSON.stringify({
                          name: contractName,
                          description: DESCRIPTION,
                          image: IMAGE,
                          external_link: LINK,
                          fee_recipient: deployer.address,
                      })
                  ).toString("base64")}`

                  const tx = avatarNftMe.setContractURI(
                      DESCRIPTION,
                      IMAGE,
                      LINK
                  )
                  await expect(tx).to.emit(avatarNftMe, "contractUriUpdated")
                  const response = await avatarNftMe.contractURI()
                  //   assert.equal(response, base64EncodedJson)
              })

              it("revert the set webpage correctly for non owner", async () => {
                  const tx = avatarNftMe
                      .connect(user)
                      .setContractURI(DESCRIPTION, IMAGE, LINK)

                  await expect(tx).to.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
          })

          describe("Mint NFT", function () {
              it("mint an NFT with native chain currency", async () => {
                  const tokenCounter = await avatarNftMe.getTokenCounter()
                  const currentToken = ethers.toBigInt(tokenCounter)
                  assert.equal(tokenCounter, currentToken)

                  const tx = avatarNftMe.formTokenUriAndMint(
                      FIRST_NAME,
                      LAST_NAME,
                      WEBSITE,
                      BODY_TYPE,
                      OUTFIT_GENDER,
                      SKIN_TONE,
                      CREATED_AT,
                      IMAGE_URI,
                      { value: SEND_MINT_FEE }
                  )
                  await expect(tx)
                      .to.emit(avatarNftMe, "NftMinted")
                      .withArgs(deployer.address, tokenCounter)

                  await expect(tx)
                      .to.emit(avatarNftMe, "mintFeeTransferedToOwner")
                      .withArgs(SEND_MINT_FEE)

                  const nftName =
                      (await avatarNftMe.symbol()) +
                      " #" +
                      currentToken +
                      " of " +
                      FIRST_NAME

                  const base64EncodedJson = `data:application/json;base64,${Buffer.from(
                      JSON.stringify({
                          name: nftName,
                          first_name: FIRST_NAME,
                          last_name: LAST_NAME,
                          external_url: WEBSITE,
                          description:
                              "An NFT that represents the Avatar of " +
                              FIRST_NAME,
                          attributes: [
                              {
                                  trait_type: "skinTone",
                                  value: SKIN_TONE,
                              },
                              {
                                  trait_type: "bodyType",
                                  value: BODY_TYPE,
                              },
                              {
                                  trait_type: "outfitGender",
                                  value: OUTFIT_GENDER,
                              },
                          ],
                          image: IMAGE_URI,
                          created_at: CREATED_AT,
                      })
                  ).toString("base64")}`

                  const response = await avatarNftMe.tokenURI(tokenCounter)
                  //   assert.equal(response, base64EncodedJson)

                  const owner = await avatarNftMe.ownerOf(tokenCounter)
                  assert(owner, deployer.address)
              })

              it("mint an NFT with a token as minting fee", async () => {
                  const tokenCounter = await avatarNftMe.getTokenCounter()
                  const currentToken = ethers.toBigInt(tokenCounter)
                  assert.equal(tokenCounter, currentToken)

                  await wethTokenAddress.mint(deployer.address, SEND_MINT_FEE)
                  await wethTokenAddress.approve(avatarNftMe, SEND_MINT_FEE)

                  await avatarNftMe.formTokenUriAndMintWithToken(
                      wethTokenAddress,
                      SEND_MINT_FEE,
                      FIRST_NAME,
                      LAST_NAME,
                      WEBSITE,
                      BODY_TYPE,
                      OUTFIT_GENDER,
                      SKIN_TONE,
                      CREATED_AT,
                      IMAGE_URI
                  )

                  const owner = await avatarNftMe.ownerOf(tokenCounter)
                  assert(owner, deployer.address)
              })

              it("Revert due to insufficient eth sent as minting fee", async () => {
                  const response = avatarNftMe.formTokenUriAndMint(
                      FIRST_NAME,
                      LAST_NAME,
                      WEBSITE,
                      BODY_TYPE,
                      OUTFIT_GENDER,
                      SKIN_TONE,
                      CREATED_AT,
                      IMAGE_URI,
                      { value: LOW_MINT_FEE }
                  )
                  await expect(response).to.be.revertedWithCustomError(
                      avatarNftMe,
                      "AvatarNftMe__NeedMoreETHSent"
                  )
              })

              it("Revert due to insufficient tokens sent as minting fee", async () => {
                  await wbtcTokenAddress.mint(deployer.address, LOW_MINT_FEE)
                  await wbtcTokenAddress.approve(avatarNftMe, LOW_MINT_FEE)

                  const response = avatarNftMe.formTokenUriAndMintWithToken(
                      wethTokenAddress,
                      LOW_MINT_FEE,
                      FIRST_NAME,
                      LAST_NAME,
                      WEBSITE,
                      BODY_TYPE,
                      OUTFIT_GENDER,
                      SKIN_TONE,
                      CREATED_AT,
                      IMAGE_URI
                  )
                  await expect(response).to.be.revertedWithCustomError(
                      avatarNftMe,
                      "AvatarNftMe__NeedMoreETHSent"
                  )
              })

              it("Revert due to no balance & no allowance of tokens", async () => {
                  const response = avatarNftMe.formTokenUriAndMintWithToken(
                      wethTokenAddress,
                      SEND_MINT_FEE,
                      FIRST_NAME,
                      LAST_NAME,
                      WEBSITE,
                      BODY_TYPE,
                      OUTFIT_GENDER,
                      SKIN_TONE,
                      CREATED_AT,
                      IMAGE_URI
                  )
                  await expect(response).to.be.revertedWith(
                      "ERC20: insufficient allowance"
                  )
              })

              it("Revert due to insufficient tokens and no allowance", async () => {
                  await wethTokenAddress.mint(deployer.address, LOW_MINT_FEE)

                  const response = avatarNftMe.formTokenUriAndMintWithToken(
                      wethTokenAddress,
                      SEND_MINT_FEE,
                      FIRST_NAME,
                      LAST_NAME,
                      WEBSITE,
                      BODY_TYPE,
                      OUTFIT_GENDER,
                      SKIN_TONE,
                      CREATED_AT,
                      IMAGE_URI
                  )
                  await expect(response).to.be.revertedWith(
                      "ERC20: insufficient allowance"
                  )
              })

              it("Revert due to sufficient tokens but no allowance", async () => {
                  await wethTokenAddress.mint(deployer.address, SEND_MINT_FEE)

                  const response = avatarNftMe.formTokenUriAndMintWithToken(
                      wethTokenAddress,
                      SEND_MINT_FEE,
                      FIRST_NAME,
                      LAST_NAME,
                      WEBSITE,
                      BODY_TYPE,
                      OUTFIT_GENDER,
                      SKIN_TONE,
                      CREATED_AT,
                      IMAGE_URI
                  )
                  await expect(response).to.be.revertedWith(
                      "ERC20: insufficient allowance"
                  )
              })

              it("Revert due to only having few tokens and complete allowance but low balance", async () => {
                  await wethTokenAddress.mint(deployer.address, LOW_MINT_FEE)
                  await wethTokenAddress.approve(avatarNftMe, SEND_MINT_FEE)

                  const response = avatarNftMe.formTokenUriAndMintWithToken(
                      wethTokenAddress,
                      SEND_MINT_FEE,
                      FIRST_NAME,
                      LAST_NAME,
                      WEBSITE,
                      BODY_TYPE,
                      OUTFIT_GENDER,
                      SKIN_TONE,
                      CREATED_AT,
                      IMAGE_URI
                  )
                  await expect(response).to.be.revertedWith(
                      "ERC20: transfer amount exceeds balance"
                  )
              })

              it("Revert due to zero number of tokens sent", async () => {
                  const response = avatarNftMe.formTokenUriAndMintWithToken(
                      wethTokenAddress,
                      0,
                      FIRST_NAME,
                      LAST_NAME,
                      WEBSITE,
                      BODY_TYPE,
                      OUTFIT_GENDER,
                      SKIN_TONE,
                      CREATED_AT,
                      IMAGE_URI
                  )
                  await expect(response).to.be.revertedWithCustomError(
                      avatarNftMe,
                      "NftAvatarMe__NeedsMoreThanZero"
                  )
              })

              it("Revert due to unsupported token address", async () => {
                  const response = avatarNftMe.formTokenUriAndMintWithToken(
                      UNSUPPORTED_TOKEN_ADDRESS,
                      SEND_MINT_FEE,
                      FIRST_NAME,
                      LAST_NAME,
                      WEBSITE,
                      BODY_TYPE,
                      OUTFIT_GENDER,
                      SKIN_TONE,
                      CREATED_AT,
                      IMAGE_URI
                  )
                  await expect(response)
                      .to.be.revertedWithCustomError(
                          avatarNftMe,
                          "NftAvatarMe__TokenNotAllowed"
                      )
                      .withArgs(UNSUPPORTED_TOKEN_ADDRESS)
              })

              it("check price increment with increment threshold", async () => {
                  for (let i = 1; i < INCREMENT_THRESHOLD + ONE; i++) {
                      await avatarNftMe.formTokenUriAndMint(
                          FIRST_NAME,
                          LAST_NAME,
                          WEBSITE,
                          BODY_TYPE,
                          OUTFIT_GENDER,
                          SKIN_TONE,
                          CREATED_AT,
                          IMAGE_URI,
                          { value: SEND_MINT_FEE }
                      )

                      //   if (i % INCREMENT_THRESHOLD == 0) {
                      //       await expect(tx)
                      //           .to.emit(avatarNftMe, "mintFeeIncremented")
                      //           .withArgs(INITIAL_MINT_FEE + INITIAL_MINT_FEE)
                      //   }
                  }

                  const tokenCounter = await avatarNftMe.getTokenCounter()
                  const currentToken = ethers.toBigInt(
                      INCREMENT_THRESHOLD + ONE
                  )
                  assert.equal(tokenCounter, currentToken)

                  const response = await avatarNftMe.getMintFee()
                  assert.equal(response, INITIAL_MINT_FEE + INITIAL_MINT_FEE)
              })
          })

          describe("Miscellaneous ", function () {
              it("add support for a new token", async () => {
                  const response = await avatarNftMe.addTokenSupport(
                      dummyToken,
                      dummyTokenPriceFeed
                  )

                  const addedTokenPriceFeed =
                      await avatarNftMe.getTokenPriceFeed(dummyToken)
                  assert.equal(addedTokenPriceFeed, dummyTokenPriceFeed)
              })

              it("revert adding support for a new token by non-owner", async () => {
                  const response = avatarNftMe
                      .connect(user)
                      .addTokenSupport(dummyToken, dummyTokenPriceFeed)

                  await expect(response).to.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
          })

          describe("view", function () {
              it("get initial price", async () => {
                  const response = await avatarNftMe.getInitialPrice()
                  assert.equal(response, INITIAL_MINT_FEE)
              })

              it("get increment threshold", async () => {
                  const response = await avatarNftMe.getIncrementThreshold()
                  assert.equal(response, INCREMENT_THRESHOLD)
              })

              it("get mint fee", async () => {
                  const response = await avatarNftMe.getMintFee()
                  assert.equal(response, INITIAL_MINT_FEE)
              })

              //   it("get eth price from usd", async () => {
              //       const response = await avatarNftMe.getEthPriceFromUsd()
              //       assert.equal(response, ETH_PRICE)
              //   })

              //   it("get token price from USD", async () => {
              //       const response = await avatarNftMe.getTokenPriceFromUsd(
              //           wethTokenAddress
              //       )
              //       assert.equal(response, TOKEN_PRICE)
              //   })
          })
      })

// also check balances of buyer and seller
