import { assert } from "chai"
import { ethers, network } from "hardhat"
import { networkConfig, developmentChains } from "../../helper-hardhat-config"

import { AvatarNftMe } from "../../typechain-types"

developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe Staging Tests", async function () {
          const chainId: number = network.config.chainId!

          let avatarNftMe: AvatarNftMe
          let deployer: any
          let ethUsdPriceFeedAddress: string
          let btcUsdPriceFeedAddress: string
          let usdcUsdPriceFeedAddress: string
          let wethTokenAddress: string
          let wbtcTokenAddress: string
          let usdcTokenAddress: string

          ethUsdPriceFeedAddress = networkConfig[chainId].wethUsdPriceFeed!
          btcUsdPriceFeedAddress = networkConfig[chainId].wbtcUsdPriceFeed!
          usdcUsdPriceFeedAddress = networkConfig[chainId].usdcUsdPriceFeed!

          wethTokenAddress = networkConfig[chainId].weth!
          wbtcTokenAddress = networkConfig[chainId].wbtc!
          usdcTokenAddress = networkConfig[chainId].usdc!

          beforeEach(async function () {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]

              avatarNftMe = await ethers.getContract("AvatarNftMe", deployer)
          })

          describe("constructor", function () {
              it("sets the owner addresses correctly", async () => {
                  const response = await avatarNftMe.owner
                  assert.equal(response, deployer.address)
              })

              it("sets the NFT Name correctly", async () => {
                  const response = await avatarNftMe.name()
                  assert.equal(response, "Avatar NFT Me")
              })

              it("sets the NFT Symbol correctly", async () => {
                  const response = await avatarNftMe.symbol()
                  assert.equal(response, "ANME")
              })

              it("sets the ETH / USD address correctly", async () => {
                  const response = await avatarNftMe.getTokenPriceFeed(
                      wethTokenAddress
                  )
                  assert.equal(response, ethUsdPriceFeedAddress)
              })

              it("sets the BTC / USD price feed address correctly", async () => {
                  const response = await avatarNftMe.getTokenPriceFeed(
                      wbtcTokenAddress
                  )
                  assert.equal(response, btcUsdPriceFeedAddress)
              })

              it("sets the USDC / USD price feed address correctly", async () => {
                  const response = await avatarNftMe.getTokenPriceFeed(
                      usdcTokenAddress
                  )
                  assert.equal(response, usdcUsdPriceFeedAddress)
              })

              it("sets the native chain aggregator address correctly", async () => {
                  const response = await avatarNftMe.getNativeChainPriceFeed()
                  assert.equal(response, ethUsdPriceFeedAddress)
              })
          })

          describe("view", function () {
              const INITIAL_COST = ethers.parseEther("50")
              const INCREMENT_THRESHOLD = ethers.parseUnits("50", 0)

              it("get initial price", async () => {
                  const response = await avatarNftMe.getInitialPrice()
                  assert.equal(response, INITIAL_COST)
              })

              it("get increment threshold", async () => {
                  const response = await avatarNftMe.getIncrementThreshold()
                  assert.equal(response, INCREMENT_THRESHOLD)
              })

              it("get mint fee", async () => {
                  const response = await avatarNftMe.getMintFee()
                  assert.equal(response, INITIAL_COST)
              })
          })
      })
