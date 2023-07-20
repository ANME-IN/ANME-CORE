import { ethers, getNamedAccounts, deployments, network } from "hardhat"
import { AvatarNftMe } from "../typechain-types"
import { developmentChains } from "../helper-hardhat-config"

async function main() {
    const { deployer } = await getNamedAccounts()
    console.log(deployer)
    const chainId: number = network.config.chainId!

    let avatarNftMe: AvatarNftMe

    const WEBPAGE = "https://www.avatarNFT.me"
    const DESCRIPTION = ""
    const IMAGE = ""
    const LINK = ""

    avatarNftMe = await ethers.getContract("AvatarNftMe", deployer)
    console.log(`Got contract ANME at ${avatarNftMe.target}`)

    const setContractUri = await avatarNftMe.setContractURI(
        DESCRIPTION,
        IMAGE,
        LINK
    )
    await setContractUri.wait()

    const setCurrentWebPageUri = await avatarNftMe.setCurrentWebPageUri(WEBPAGE)
    await setCurrentWebPageUri.wait()
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
