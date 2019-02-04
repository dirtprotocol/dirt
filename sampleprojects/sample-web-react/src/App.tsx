import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import { Dirt, ChallengeableRegistry, RegistryItem, TokenValue } from "@dirt/lib";
var timeAgo = require('node-time-ago');

interface State {
  web3Loaded: boolean
  name: string
  listMembers: RegistryItem[]
}

class App extends Component<{}, State> {
  web3 = (window as any).web3
  dirt!: Dirt
  registry!: ChallengeableRegistry

  constructor(props: object) {
    super(props);
    this.state = {
      ...this.state,
      web3Loaded: false,
      name: '',
      listMembers: [],
    }
  }

  componentDidMount() {
    // On page load, load the MetaMask-injected web3.
    window.addEventListener('load', this.loadWeb3);
  }

  loadWeb3 = async () => {
    // Modern DApp Browsers (request user permission)
    let ethereum = (window as any).ethereum
    if (ethereum) {
      try {
        await ethereum.enable()
        console.log('loaded web3 (consented)')
        this.setState({
          web3Loaded: true
        })
        // User has allowed account access to DApp...
      } catch (e) {
        // User has denied account access to DApp...
        console.log('metamask permission declined by user')
      }
    }

    // Legacy DApp Browsers (no explicit permission necessary)
    else if (this.web3) {
      console.log('loaded web3 (legacy)')
      this.setState({
        web3Loaded: true
      })
    }

    // Non-DApp Browsers
    else {
      alert('Pleases install MetaMask!');
      return
    }

    // Load the DIRT contract using DIRT lib
    await this.loadDirt()
  }

  loadDirt = async () => {
    const DIRT_CONTRACT_ADDRESS = '0xe00ac6b8538b241283d6dfa79e2de530294ff69f'
    const REGISTRY_ADDRESS = '0xb0bf5cd6f278c63d2432da8a9598e9d9ff17728c'
    this.dirt = await Dirt.create({
      rootAddress: DIRT_CONTRACT_ADDRESS,
      web3: this.web3
    })
    this.registry = await this.dirt.getRegistryAtAddress<ChallengeableRegistry>(
      REGISTRY_ADDRESS, ChallengeableRegistry)

    // Read the current registry items
    this.setState({
      ...this.state,
      listMembers: await this.registryItems()
    })
  }

  registryItems = async (): Promise<any[]> => {
    let items = []

    let count = await this.registry.count()
    for (let i = count - 1; i >= Math.max(0, count - 10); i--) {
      items.push(await this.registry.itemAtIndex(i))
    }

    return items
  }

  updateName = (e: any) => {
    this.setState({
      ...this.state,
      name: e.target.value
    })
  }

  render() {

    let join = async (event: any) => {
      event.preventDefault()
      // Add an entry to the Dataset
      await this.registry.addItem(Date.now().toString(), this.state.name, TokenValue.from(1))
      console.log('addItem success')
    }

    return (
      <div className="App">
        <header className="App-header">
          <h2>List of DIRT Developers: </h2>
          <table className="MyClassName">
            <thead>
            </thead>
            <tbody>
              {this.state.listMembers.map((x) =>
                <tr key={x.value}>
                  <td>({timeAgo(parseInt(x.key))})</td><td>{x.value}</td>
                </tr>
              )}
            </tbody>
          </table>

          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Add yourself to the list of DIRT Developers.
            <br />
            You will need <a href="https://metamask.io"> MetaMask</a> to proceed.
          </p>

          <TextField id="name" value={this.state.name} onChange={this.updateName}
            label='Your name'> </TextField>
          <Button variant="contained" color="primary" onClick={join}>Add me! </Button>

          <p>Reload this page after MetaMask confirms the transaction.</p>

        </header>
      </div>
    );
  }
}

export default App;
