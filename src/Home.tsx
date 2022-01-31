import { useEffect, useMemo, useState, useCallback } from "react";
import * as anchor from "@project-serum/anchor";

import styled from "styled-components";
import { Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton, WalletDisconnectButton, } from "@solana/wallet-adapter-material-ui";
import {
    awaitTransactionSignatureConfirmation,
    CandyMachineAccount,
    getCandyMachineState,
    mintOneToken,
} from "./candy-machine";
import { AlertState } from "./utils";
import { MintButton } from "./MintButton";
import Logo from "./Logo.png";

const ConnectButton = styled(WalletDialogButton)`
    background-color: #92e643 !important;
    color: #0d0d0d !important;
    font-size: 30px !important;
`;

const DisconnectButton = styled(WalletDisconnectButton)`
    background-color: #92e643 !important;
    color: #0d0d0d !important;
    font-size: 20px !important;
`;

const Item = (props: any) => {
  return (
      <span style={{
          marginTop: '10px',
          color: '#92e643',
          fontSize: '24px',
          ...props.style,
      }}>
          {props.children}
      </span>
  );
}

export interface HomeProps {
    candyMachineId?: anchor.web3.PublicKey;
    connection: anchor.web3.Connection;
    startDate: number;
    txTimeout: number;
    rpcHost: string;
    tokenMintPublicKey: PublicKey;
}

export const shortenAddress = (address: string, chars = 4): string => {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

const Home = (props: HomeProps) => {
    const [isUserMinting, setIsUserMinting] = useState(false);
    const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();
    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: "",
        severity: undefined,
    });

    const wallet = useWallet();

    const [paymentTokenExists, setPaymentTokenExists] = useState(false);
    const [paymentTokenCount, setPaymentTokenCount] = useState(0);

    const anchorWallet = useMemo(() => {
        if (
            !wallet ||
            !wallet.publicKey ||
            !wallet.signAllTransactions ||
            !wallet.signTransaction
        ) {
            return;
        }

        return {
            publicKey: wallet.publicKey,
            signAllTransactions: wallet.signAllTransactions,
            signTransaction: wallet.signTransaction,
        } as anchor.Wallet;
    }, [wallet]);

    const refreshCandyMachineState = useCallback(async () => {
        if (!anchorWallet || !wallet.publicKey) {
            return;
        }

        if (props.candyMachineId) {
            try {
                const cndy = await getCandyMachineState(
                    anchorWallet,
                    props.candyMachineId,
                    props.connection,
                    props.tokenMintPublicKey,
                    wallet.publicKey,
                );

                console.log(JSON.stringify(cndy.state, null, 4));

                setCandyMachine(cndy);
                setPaymentTokenExists(cndy.state.paymentTokenExists);
                setPaymentTokenCount(cndy.state.paymentTokenCount);
            } catch (e) {
                console.log("There was a problem fetching Candy Machine state");
                console.log(e);
            }
        }
    }, [anchorWallet, props.candyMachineId, props.connection, wallet.publicKey, props.tokenMintPublicKey]);

    const onMint = async () => {
        try {
            setIsUserMinting(true);
            document.getElementById("#identity")?.click();
            if (wallet.connected && candyMachine?.program && wallet.publicKey) {
                const mintTxId = (
                    await mintOneToken(candyMachine, wallet.publicKey)
                )[0];

                let status: any = { err: true };
                if (mintTxId) {
                    status = await awaitTransactionSignatureConfirmation(
                        mintTxId,
                        props.txTimeout,
                        props.connection,
                        true
                    );
                }

                if (status && !status.err) {
                    setAlertState({
                        open: true,
                        message: "Congratulations! Mint succeeded!",
                        severity: "success",
                    });
                } else {
                    setAlertState({
                        open: true,
                        message: "Mint failed! Please try again!",
                        severity: "error",
                    });
                }
            }
        } catch (error: any) {
            let message = error.msg || "Minting failed! Please try again!";
            if (!error.msg) {
                if (!error.message) {
                    message = "Transaction Timeout! Please try again.";
                } else if (error.message.indexOf("0x137")) {
                    message = `SOLD OUT!`;
                } else if (error.message.indexOf("0x135")) {
                    message = `Insufficient funds to mint. Please fund your wallet.`;
                }
            } else {
                if (error.code === 311) {
                    message = `SOLD OUT!`;
                    window.location.reload();
                } else if (error.code === 312) {
                    message = `Minting period hasn't started yet.`;
                }
            }

            setAlertState({
                open: true,
                message,
                severity: "error",
            });
        } finally {
            setIsUserMinting(false);
        }
    };

    useEffect(() => {
        refreshCandyMachineState();
    }, [
        anchorWallet,
        props.candyMachineId,
        props.connection,
        refreshCandyMachineState,
    ]);

    return (
        <main>
            <div
                style={{
                    marginTop: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                }}
            >
                {wallet.connected && wallet.publicKey && (
                    <>
                                                
                        {paymentTokenExists && (
                            <>
                                <div style={{ display: 'flex', width: '90%', justifyContent: 'space-between', fontSize: '28px' }}>
                                    <Item>
                                        Wallet: {shortenAddress(wallet.publicKey.toBase58() || "")}
                                    </Item>

                                    <Item>
                                        Mint Cost: Free + Transaction Fees (~0.011 SOL)
                                    </Item>
                                </div>

                                <div style={{ flexDirection: 'column', display: 'flex', alignItems: 'center', marginTop: '40px' }}>
                                    {paymentTokenCount === 0 && (
                                        <>
                                            <Item style={{ fontSize: '30px' }}>
                                                Congratulations, you have claimed all your 3D slugs!
                                            </Item>

                                            <DisconnectButton
                                                style={{ marginTop: '30px' }}
                                                className="button is-primary is-normal"
                                            >
                                                Disconnect Wallet
                                            </DisconnectButton>
                                        </>
                                    )}

                                    {paymentTokenCount > 0 && (
                                        <>
                                            <Item style={{ fontSize: '30px', marginBottom: '30px' }}>
                                                {`You can claim ${paymentTokenCount} 3D slug${paymentTokenCount === 1 ? '' : 's'}!`}
                                            </Item>

                                            <MintButton
                                                onMint={onMint}
                                                candyMachine={candyMachine}
                                                isMinting={isUserMinting}
                                            />
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        {candyMachine && !paymentTokenExists && (
                            <>
                                <div style={{ display: 'flex', width: '90%', justifyContent: 'space-between', fontSize: '28px' }}>
                                    <Item>

                                        Wallet: {shortenAddress(wallet.publicKey.toBase58() || "")}
                                    </Item>

                                    <Item>
                                        Mint Cost: Free + Transaction Fees (~0.011 SOL)
                                    </Item>
                                </div>

                                <Item style={{ marginTop: '60px', width: '600px' }}>
                                    You are not eligible for any 3D Slugs. Please verify you have the correct wallet address connected.
                                </Item>

                                <Item style={{ marginTop: '40px', width: '600px' }}>
                                    3D slugs were rewarded to users who burnt one or more slugs, or who participated in the rugged Dogs on the Block giveaway.
                                </Item>

                                <DisconnectButton
                                    style={{ marginTop: '30px' }}
                                    className="button is-primary is-normal"
                                    color="primary"
                                >
                                    Disconnect Wallet
                                </DisconnectButton>

                                <a href="https://solslugs.com/#/3dslugs" style={{ color: '#92e643', marginTop: '30px' }}>
                                    Verify Eligibility
                                </a>
                            </>
                        )}
                    </>
                )}

                {!wallet.connected && (
                    <>
                        <p style={{ color: '#92e643', fontSize: '30px' }}>
                            Connect your wallet to mint a 3D Slug!
                        </p>

                        <ConnectButton
                            style={{ marginTop: "1rem" }}
                            className="button is-primary is-normal"
                        />
                    </>
                )}

                <img
                    src={Logo}
                    alt=''
                    style={{
                        width: '400px',
                    }}
                />
            </div>

            <Snackbar
                open={alertState.open}
                autoHideDuration={6000}
                onClose={() => setAlertState({ ...alertState, open: false })}
            >
                <Alert
                    onClose={() =>
                        setAlertState({ ...alertState, open: false })
                    }
                    severity={alertState.severity}
                >
                    {alertState.message}
                </Alert>
            </Snackbar>
        </main>
    );

    /*

          {!wallet.connected ? (
            <ConnectButton>Connect Wallet</ConnectButton>
          ) : (
            <>
              <Header candyMachine={candyMachine} />
              <MintContainer>
                {candyMachine?.state.isActive &&
                candyMachine?.state.gatekeeper &&
                wallet.publicKey &&
                wallet.signTransaction ? (
                  <GatewayProvider
                    wallet={{
                      publicKey:
                        wallet.publicKey ||
                        new PublicKey(CANDY_MACHINE_PROGRAM),
                      //@ts-ignore
                      signTransaction: wallet.signTransaction,
                    }}
                    gatekeeperNetwork={
                      candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                    }
                    clusterUrl={rpcUrl}
                    options={{ autoShowModal: false }}
                  >
                    <MintButton
                      candyMachine={candyMachine}
                      isMinting={isUserMinting}
                      onMint={onMint}
                    />
                  </GatewayProvider>
                ) : (
                  <MintButton
                    candyMachine={candyMachine}
                    isMinting={isUserMinting}
                    onMint={onMint}
                  />
                )}
              </MintContainer>
            </>
          )}

      </Container>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </Container>
  );
     */
};

export default Home;
