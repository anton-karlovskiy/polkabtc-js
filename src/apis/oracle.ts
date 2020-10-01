import { ErrorCode } from "../interfaces/default";
import { ApiPromise } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { BTreeSet } from "@polkadot/types/codec";
import { AccountId } from "@polkadot/types/interfaces";
import { Moment } from "@polkadot/types/interfaces/runtime";
import { u128 } from "@polkadot/types/primitive";

const defaultFeedName = "BTC/DOT";
const granularity = 5;

export type OracleInfo = {
    exchangeRate: number;
    feed: string;
    name: string;
    online: boolean;
    lastUpdate: Date;
};

export interface OracleAPI {
    getExchangeRate(): Promise<number>;
    getFeed(): Promise<string>;
    getLastExchangeRateTime(): Promise<Date>;
    getOracleName(): Promise<string>;
    isOnline(): Promise<boolean>;
    getInfo(): Promise<OracleInfo>;
}

export class DefaultOracleAPI implements OracleAPI {
    constructor(private api: ApiPromise) { }

    async getInfo(): Promise<OracleInfo> {
        const results = await this.api.queryMulti([
            this.api.query.exchangeRateOracle.exchangeRate,
            this.api.query.exchangeRateOracle.authorizedOracle,
            this.api.query.exchangeRateOracle.lastExchangeRateTime,
            this.api.query.security.errors,
        ]);
        const name = await this.api.query.exchangeRateOracle.oracleNames(<AccountId>results[1]);
        return {
            exchangeRate: this.convertExchangeRate(<u128>results[0]),
            feed: await this.getFeed(),
            name: name.toUtf8(),
            online: !this.hasOracleError(<BTreeSet<ErrorCode>>results[3]),
            lastUpdate: this.convertMoment(<Moment>results[2]),
        };
    }

    async getExchangeRate(): Promise<number> {
        const rawRate = await this.api.query.exchangeRateOracle.exchangeRate();
        return this.convertExchangeRate(rawRate);
    }

    async getOracleName(): Promise<string> {
        const accountId = await this.api.query.exchangeRateOracle.authorizedOracle();
        const rawName = await this.api.query.exchangeRateOracle.oracleNames(accountId);
        return rawName.toUtf8();
    }

    getFeed(): Promise<string> {
        return Promise.resolve(defaultFeedName);
    }

    async getLastExchangeRateTime(): Promise<Date> {
        const moment = await this.api.query.exchangeRateOracle.lastExchangeRateTime();
        return this.convertMoment(moment);
    }

    async isOnline(): Promise<boolean> {
        const errors = await this.api.query.security.errors();
        return !this.hasOracleError(errors);
    }

    private hasOracleError(errors: BTreeSet<ErrorCode>): boolean {
        for (const error of errors.values()) {
            if (error.isOracleOffline) {
                return true;
            }
        }
        return false;
    }

    private convertMoment(moment: Moment): Date {
        return new Date(moment.toNumber() * 1000);
    }

    private convertExchangeRate(rate: u128): number {
        return rate.toNumber() / Math.pow(10, granularity);
    }
}