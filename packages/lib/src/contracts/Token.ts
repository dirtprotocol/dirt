import * as BigNumber from "bignumber.js";
import { Contract } from './Contract';

const DECIMALS: BigNumber = new BigNumber(10).pow(18);

export class TokenValue {

    constructor(private _bigNumber: BigNumber, private _decimals: BigNumber) {
    }

    get value(): number {
        return this._bigNumber.div(this._decimals).toNumber();
    }

    set value(value: number) {
        this._bigNumber = this._decimals.times(value);
    }

    get raw(): BigNumber {
        return this._bigNumber;
    }

    set raw(value: BigNumber) {
        this._bigNumber = value;
    }

    toString(radix?: number): string {
        return this.value.toString(radix);
    }

    add(value: number | TokenValue): TokenValue {
        let token = (value instanceof TokenValue) ? value : TokenValue.from(value);
        return TokenValue.fromRaw(this.raw.add(token.raw));
    }

    sub(value: number | TokenValue): TokenValue {
        let token = (value instanceof TokenValue) ? value : TokenValue.from(value);
        return TokenValue.fromRaw(this.raw.sub(token.raw));
    }

    equals(value: number | TokenValue): boolean {
        let raw_value = (value instanceof TokenValue) ? value : TokenValue.from(value);
        return this.raw.eq(raw_value);
    }

    static from(value: number): TokenValue {
        return new TokenValue(DECIMALS.times(value), DECIMALS);
    }

    static fromRaw(value: BigNumber): TokenValue {
        return new TokenValue(value, DECIMALS);
    }
}

export class TokenSpenderApprovalScope {

    private reverting: boolean = false;

    constructor(private reversion?: () => Promise<void>) {
    }

    async revert() {
        if (this.reversion && !this.reverting) {
            this.reverting = true;

            try {
                await this.reversion();
            }
            catch (e) {
                this.reverting = false;
                throw e;
            }
        }
    }

    static Empty = new TokenSpenderApprovalScope();
}

export class Token extends Contract {

    public symbol: string;
    public decimals: number;
    public totalSupply: TokenValue;

    async init(): Promise<void> {
        // Load static metadata
        await super.init();
        this.name = await this.instance.name.call();
        this.symbol = await this.instance.symbol.call();
        this.decimals = (await this.instance.decimals.call()).toNumber();
        this.totalSupply = TokenValue.fromRaw(await this.instance.totalSupply.call());
    }

    async transfer(toAddress: string, amount: TokenValue): Promise<void> {
        this.trace.message(`Transfer ${amount.value} to ${toAddress}`);
        await this.instance.transfer(toAddress, amount.raw, { from: this.dirt.defaultAccount() });
    }

    async balanceOf(account?: string): Promise<TokenValue> {
        account = account || this.dirt.defaultAccount();
        let raw = await this.instance.balanceOf.call(account, { from: this.dirt.defaultAccount() });
        return TokenValue.fromRaw(raw);
    }

    async approveAndCall(toAddress: string, amount: TokenValue, extraData: string): Promise<void> {
      return this.instance.approveAndCall(
        toAddress,
        amount.raw,
        extraData
      );
    }

    async approveFor(spender: string, value: TokenValue): Promise<void> {
        this.trace.message(`Approve ${value.value} for ${spender}`);
        await this.instance.approve(spender, value.raw, { from: this.dirt.defaultAccount() });
    }

    async allowance(owner: string, spender: string): Promise<TokenValue> {
        let raw = await this.instance.allowance.call(owner, spender);
        return TokenValue.fromRaw(raw);
    }

    async increaseApproval(spender: string, value: TokenValue): Promise<void> {
        let currentAllowance = await this.allowance(this.dirt.defaultAccount(), spender);
        let increased = currentAllowance.add(value);
        this.trace.message(`Increasing approval from ${currentAllowance.value} to ${increased.value} for ${spender}`);
        await this.instance.approve(spender, increased.raw, { from: this.dirt.defaultAccount() });
    }

    async decreaseApproval(spender: string, value: TokenValue): Promise<void> {
        let currentAllowance = await this.allowance(this.dirt.defaultAccount(), spender);
        let decreased = currentAllowance.sub(value);
        this.trace.message(`Decreasing approval from ${currentAllowance.value} to ${decreased.value} for ${spender}`);
        await this.instance.approve(spender, decreased.raw, { from: this.dirt.defaultAccount() });
    }

    async ensureSpenderApproval(spender: string, required: TokenValue): Promise<TokenSpenderApprovalScope> {
        let current = await this.allowance(this.dirt.defaultAccount(), spender);

        if (current.raw.gt(required.raw)) {
            // We have enough
            return TokenSpenderApprovalScope.Empty;
        }

        // We need to increase the approval
        let additional = required.sub(current);

        await this.increaseApproval(spender, additional);

        return new TokenSpenderApprovalScope(() => this.decreaseApproval(spender, additional));
    }
}
