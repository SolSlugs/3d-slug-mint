import styled from "styled-components";
import Button from "@material-ui/core/Button";
import { CandyMachineAccount } from "./candy-machine";
import { CircularProgress } from "@material-ui/core";
import { GatewayStatus, useGateway } from "@civic/solana-gateway-react";
import { useEffect, useState } from "react";

export const CTAButton = styled(Button)`
    width: 200px;
    height: 60px;
    background-color: #92e643 !important;
    color: #0d0d0d !important;
    font-size: 30px !important;
`; // add your own styles here

export const MintButton = ({
    onMint,
    candyMachine,
    isMinting,
}: {
    onMint: () => Promise<void>;
    candyMachine?: CandyMachineAccount;
    isMinting: boolean;
}) => {
    const { requestGatewayToken, gatewayStatus } = useGateway();
    const [clicked, setClicked] = useState(false);

    useEffect(() => {
        if (gatewayStatus === GatewayStatus.ACTIVE && clicked) {
            onMint();
            setClicked(false);
        }
    }, [gatewayStatus, clicked, setClicked, onMint]);

    const getMintButtonContent = () => {
        if (candyMachine?.state.isSoldOut) {
            return "SOLD OUT";
        } else if (isMinting) {
            return <CircularProgress />;
        } else if (candyMachine?.state.isPresale) {
            return "PRESALE MINT";
        } else if (clicked && candyMachine?.state.gatekeeper) {
            return <CircularProgress />;
        }

        return "MINT";
    };

    return (
        <CTAButton
            disabled={
                clicked ||
                candyMachine?.state.isSoldOut ||
                isMinting ||
                !candyMachine?.state.isActive
            }
            onClick={async () => {
                setClicked(true);
                if (
                    candyMachine?.state.isActive &&
                    candyMachine?.state.gatekeeper
                ) {
                    if (gatewayStatus === GatewayStatus.ACTIVE) {
                        setClicked(true);
                    } else {
                        await requestGatewayToken();
                    }
                } else {
                    await onMint();
                    setClicked(false);
                }
            }}
            variant="contained"
        >
            {getMintButtonContent()}
        </CTAButton>
    );
};
