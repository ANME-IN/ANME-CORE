import { ethers, getNamedAccounts, deployments, network } from "hardhat"
import { AvatarNftMe } from "../typechain-types"
import { developmentChains } from "../helper-hardhat-config"

async function main() {
    const { deployer } = await getNamedAccounts()
    console.log(deployer)
    const chainId: number = network.config.chainId!

    let avatarNftMe: AvatarNftMe
    if (developmentChains.includes(network.name)) {
        console.log("Deploying AvatarNftMe contract to local network")
        await deployments.fixture(["all"])
    }

    avatarNftMe = await ethers.getContract("AvatarNftMe", deployer)
    console.log(`Got contract ANME at ${avatarNftMe.target}`)

    const tokenCounter = await avatarNftMe.getTokenCounter()

    const FIRST_NAME = "John"
    const LAST_NAME = "Doe"
    const WEBSITE = "https://www.avatarNFT.me"
    const BODY_TYPE = "Regular"
    const OUTFIT_GENDER = "Male"
    const SKIN_TONE = "Light"
    const CREATED_AT = "2021-08-01T00:00:00.000Z"
    const IMAGE_URI = "https://www.avatarNFT.me/image.png"
    const DESCRIPTION = "An NFT that represents the Avatar of " + FIRST_NAME

    const MINT_FEE = ethers.parseEther("0.1")
    const transactionResponse = await avatarNftMe.formTokenUriAndMint(
        FIRST_NAME,
        LAST_NAME,
        WEBSITE,
        BODY_TYPE,
        OUTFIT_GENDER,
        SKIN_TONE,
        CREATED_AT,
        IMAGE_URI,
        { value: MINT_FEE }
    )
    await transactionResponse.wait()

    const holder = await avatarNftMe.ownerOf(tokenCounter)
    console.log(`Minted token ${tokenCounter} to ${holder}`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
