import { Dirt } from '../services/Dirt';
import { Contract } from './Contract';

export interface IContractConstructable {
    new(dirt: Dirt, config: IContractConfiguration): any;
}

export interface IContractConfiguration {
    name?: string,
    address?: string,
    type?: IContractConstructable,
    instance?: any,
}
