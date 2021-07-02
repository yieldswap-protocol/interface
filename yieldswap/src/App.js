import './App.css';
import Web3 from 'web3'
import React, { Component } from "react"
import { USDC_addr, AMM_ABI, AMM_addr, lending_pool_abi, lending_pool_addr, oracle_abi, oracle_addr, ERC20_abi} from './config.js'
const BigNumber = require('bignumber.js')
BigNumber.set({ ROUNDING_MODE: BigNumber.ROUND_UP })
const tenor = BigNumber(864000)

class App extends Component {

    componentWillMount() {
        this.loadBlockchainData()
    }

    handleChange(event) {
        const saveValue = event.target.value
        this.setState({notional: saveValue})
        this.loadBlockchainData()
    }

    async approve() {
        const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
        const AMM = new web3.eth.Contract(ERC20_abi, USDC_addr)
        await AMM.methods.approve(AMM_addr, this.state.receiver_swap_offer[3]).send({from: this.state.account})
    }

    async payerSwap() {
        const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
        const AMM = new web3.eth.Contract(AMM_ABI, AMM_addr)
        var notional = (new BigNumber(this.state.notional)).multipliedBy(new BigNumber(1000000))
        var max_rate = new BigNumber("1000000000000000000000000000")
        await AMM.methods.payer_swap(USDC_addr, notional, max_rate, tenor).send({from: this.state.account})
    }

    async receiverSwap() {
        const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
        const AMM = new web3.eth.Contract(AMM_ABI, AMM_addr)
        var notional = (new BigNumber(this.state.notional)).multipliedBy(new BigNumber(1000000))
        var max_rate = new BigNumber("0")
        await AMM.methods.receiver_swap(USDC_addr, notional, max_rate, tenor).send({from: this.state.account})
    }

    async settleSwap() {
        const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
        const AMM = new web3.eth.Contract(AMM_ABI, AMM_addr)
        await AMM.methods.settle_swap(this.state.account, 0).send({from: this.state.account})
    }

    async loadBlockchainData() {
        const ray_perc = new BigNumber("10000000000000000000000000")
        const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
        const network = await web3.eth.net.getNetworkType()

        window.web3 = new Web3(window.ethereum);
        await window.ethereum.enable();

        const accounts = await web3.eth.getAccounts()
        this.setState({ account: accounts[0]})

        // AMM
        const AMM = new web3.eth.Contract(AMM_ABI, AMM_addr)
        const available_liquidity = ((await AMM.methods.available_liquidity().call())/1000000).toLocaleString()
        this.setState({ available_liquidity})

        var notional = (new BigNumber(this.state.notional)).multipliedBy(new BigNumber(1000000))
        const payer_swap_rate = (new BigNumber(await AMM.methods.payer_swap_rate(notional).call())).div(ray_perc).toString().substring(0,4)
        const receiver_swap_rate = (new BigNumber(await AMM.methods.receiver_swap_rate(notional).call())).div(ray_perc).toString().substring(0,4)

        this.setState({ payer_swap_rate })
        this.setState({ receiver_swap_rate })

        const receiver_swap_offer = await AMM.methods.receiver_swap_offer(USDC_addr, notional, tenor).call()
        const payer_swap_offer = await AMM.methods.receiver_swap_offer(USDC_addr, notional, tenor).call()
        const collateral = (new BigNumber(receiver_swap_offer[3]).div(new BigNumber(1000000))).toLocaleString().substring(0,4)
        this.setState({ collateral })
        this.setState({ receiver_swap_offer })
        this.setState({ payer_swap_offer })

        // Oracle
        const oracle = new web3.eth.Contract(oracle_abi, oracle_addr)
        var timestamp = new BigNumber((await web3.eth.getBlock("latest")).timestamp)
        const floating_rate = (new BigNumber(await oracle.methods.get_rate_at(USDC_addr, timestamp).call())).div(ray_perc).toString().substring(0,4)
        this.setState({ floating_rate })

        /*
        const lending_pool = new web3.eth.Contract(lending_pool_abi, lending_pool_addr)
        const borrow_rate = await lending_pool.methods.getReserveData(USDC_addr).call()
        console.log(borrow_rate.currentVariableBorrowRate)
        */
    }

    constructor(props) {
        super(props)
        this.state = { account: '' }
        this.state = { notional: 1000 }
        this.handleChange = this.handleChange.bind(this)
        this.approve = this.approve.bind(this);
        this.payerSwap = this.payerSwap.bind(this);
        this.receiverSwap = this.receiverSwap.bind(this);
        this.settleSwap = this.settleSwap.bind(this);
      }

    render() {
        return (
          <div className="container">
            <h1>Yield Swap</h1>
            <p><b>AMM address:</b> <a href={"https://kovan.etherscan.io/address/"+ AMM_addr}>{AMM_addr}</a></p>
            <p><b>Liquidity pool size:</b> {this.state.available_liquidity} USDC</p>
            <p><b>USDC Address:</b> <a href={"https://kovan.etherscan.io/address/"+ USDC_addr}>{USDC_addr}</a></p>
            <p><b>Tenor:</b> 10 days</p>
            <p><b>Floating rate:</b> { this.state.floating_rate }%</p>
            <p><b>Notional:</b> <input style={{width: '150px'}} type="number" min="0" pattern="[0-9]+" value={this.state.notional} onChange={this.handleChange}/></p>
            <p><b>Swap rate:</b> {this.state.receiver_swap_rate}% / {this.state.payer_swap_rate}%</p>
            <p><b>Collateral:</b> {this.state.collateral} USDC <button onClick={async () => {await this.approve();} }>Approve</button></p>

            <button onClick={async () => {await this.payerSwap();} }>Payer Swap</button> <button onClick={async () => {await this.receiverSwap();} }>Receiver Swap</button>
            <button onClick={async () => {await this.settleSwap();} }>Settle Swap</button>
          </div>
        );
    }
}

export default App;
