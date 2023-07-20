import { ethers, getNamedAccounts, deployments } from "hardhat"

async function main() {
    const { deployer } = await getNamedAccounts()
    console.log(deployer)
    // const fundMeDeployment = await deployments.get("fundMe")
    // const fundMe = await ethers.getContractAt(
    //   "FundMe",
    //   fundMeDeployment.address,
    //   deployer
    // )
    const avatarNftMe = await ethers.getContract("AvatarNftMe", deployer)
    console.log(`Got contract FundMe at ${avatarNftMe.target}`)
    console.log("Funding contract...")
    // const transactionResponse = await avatarNftMe.name()
    // await transactionResponse.wait()
    // console.log("Funded!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
