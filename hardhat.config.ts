import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.28",
        settings: {
            optimizer: { enabled: true, runs: 200 },
            evmVersion: "cancun",
        },
    },
    networks: {
        hardhat: {},
        "polkadot-hub-testnet": {
            url: process.env.POLKADOT_HUB_RPC_URL!,
            chainId: 420420421,
            accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
        },
    },
    etherscan: {
        apiKey: {
            "polkadot-hub-testnet": process.env.BLOCKSCOUT_API_KEY!,
        },
        customChains: [
            {
                network: "polkadot-hub-testnet",
                chainId: 420420421,
                urls: {
                    apiURL: `${process.env.BLOCKSCOUT_URL}/api`,
                    browserURL: process.env.BLOCKSCOUT_URL!,
                },
            },
        ],
    },
};

export default config;