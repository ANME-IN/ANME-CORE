import { assert } from "chai"
import { ethers, network } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
import { AvatarNftMe } from "../../typechain-types"

developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe Staging Tests", async function () {
          let avatarNftMe: AvatarNftMe
          let deployer: any

          beforeEach(async function () {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              avatarNftMe = await ethers.getContract("AvatarNftMe", deployer)
          })

          it("sets the aggregator addresses correctly", async () => {
              const response = await avatarNftMe.owner
              assert.equal(response, deployer)
          })
      })
