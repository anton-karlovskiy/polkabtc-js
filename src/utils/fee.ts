import Big from "big.js";

export function calculateAPY(feesPolkaBTC: string, feesDOT: string, lockedDOT: string, dotToBtcRate: Big): string {
    const feesPolkaBTCBig = new Big(feesPolkaBTC.toString());
    const feesPolkaBTCInDot = feesPolkaBTCBig.mul(dotToBtcRate);
    const totalFees = new Big(feesDOT).add(feesPolkaBTCInDot);

    const lockedDotBig = new Big(lockedDOT.toString());

    // convert to percent
    return totalFees.div(lockedDotBig).mul(100).toString();
}
