import {
    Registry,
    RegistryItem
} from './Registry';

export class SimpleRegistry extends Registry < RegistryItem > {

    async item(key: string): Promise < RegistryItem > {
        let raw = await this.instance.getItem.call(key);
        return this.unpack([key, ...raw]);
    }

    async itemAtIndex(index: number): Promise < RegistryItem > {
        let raw = await this.instance.getAtIndex.call(index);
        return this.unpack(raw);
    }

    async addItem(key: string, value: string): Promise < RegistryItem > {
        await this.instance.addItem(key, value, {
            from: this.dirt.defaultAccount()
        });
        return await this.item(key);
    }

    async editItem(key: string, value: string): Promise < RegistryItem > {
        await this.instance.editItem(key, value, {
            from: this.dirt.defaultAccount()
        });
        return await this.item(key);
    }

    private unpack(value: any[]): RegistryItem {
        return new RegistryItem(
            this.address, // address
            value[0], // registry key
            value[1], // owner
            value[2], // registry value
            value[3].toNumber() // timestamp
        );
    }
}