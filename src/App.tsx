import "./App.css";
import { useMemo } from "react";
import * as anchor from "@project-serum/anchor";
import Home from "./Home";

import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
    getPhantomWallet,
    getSlopeWallet,
    getSolflareWallet,
    getSolletWallet,
    getSolletExtensionWallet,
} from "@solana/wallet-adapter-wallets";

import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletDialogProvider } from "@solana/wallet-adapter-material-ui";

import { ThemeProvider, createTheme } from "@material-ui/core";

const theme = createTheme({
    palette: {
        type: "dark",
    },
});

const getCandyMachineId = (): anchor.web3.PublicKey | undefined => {
    try {
        const candyMachineId = new anchor.web3.PublicKey(
            '8tQJA7cqHaVCjyA9tK2LhfhhUqxxAWD4fF3LFfSxHC8i',
        );

        return candyMachineId;
    } catch (e) {
        console.log("Failed to construct CandyMachineId", e);
        return undefined;
    }
};

const candyMachineId = getCandyMachineId();
const network = 'mainnet-beta' as WalletAdapterNetwork;
const rpcHost = 'https://ssc-dao.genesysgo.net/';
const connection = new anchor.web3.Connection(
    rpcHost ? rpcHost : anchor.web3.clusterApiUrl("devnet")
);

const tokenMintPublicKey = new PublicKey(
    '3DSLGYdPHcrhcuYNj4Gn6bwQYA5dyEmXjeQiY2vJPX6y',
);

const startDateSeed = parseInt(process.env.REACT_APP_CANDY_START_DATE!, 10);
const txTimeoutInMilliseconds = 30000;

const App = () => {
    const endpoint = useMemo(() => clusterApiUrl(network), []);

    const wallets = useMemo(
        () => [
            getPhantomWallet(),
            getSolflareWallet(),
            getSlopeWallet(),
            getSolletWallet({ network }),
            getSolletExtensionWallet({ network }),
        ],
        []
    );

    return (
        <ThemeProvider theme={theme}>
            <ConnectionProvider endpoint={endpoint}>
                <WalletProvider wallets={wallets} autoConnect>
                    <WalletDialogProvider>
                        <Home
                            candyMachineId={candyMachineId}
                            connection={connection}
                            startDate={startDateSeed}
                            txTimeout={txTimeoutInMilliseconds}
                            rpcHost={rpcHost}
                            tokenMintPublicKey={tokenMintPublicKey}
                        />
                    </WalletDialogProvider>
                </WalletProvider>
            </ConnectionProvider>
        </ThemeProvider>
    );
};

export default App;
