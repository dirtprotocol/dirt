import { Contract } from './Contract';

export class Faucet extends Contract {
    async give(): Promise<boolean> {
        return this.instance.give({
            from: this.dirt.defaultAccount()
        })
    }
}