declare module 'truffle-contract' {

    interface TruffleContract<T> {
        "new"(...args: any[]): Promise<T>;
        deployed(): Promise<T>;
        at(address: string): T;
        setProvider(provider: any): void;
    }

    function contractCtor<T>(...args: any[]): TruffleContract<T>;

    export = contractCtor;
}

