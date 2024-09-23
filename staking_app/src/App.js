import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import ERC20ABI from './ERC20ABI.json'; 
import StakingABI from './StakingABI.json'; 

const App = () => {
  const [account, setAccount] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [amount, setAmount] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [stakedAmount, setStakedAmount] = useState('0');
  const [rewardAmount, setRewardAmount] = useState('0');
  const [unstakeAmount, setUnstakeAmount] = useState('0');
  const [totalInvestedAmount, setTotalInvestedAmount] = useState('0');
  const [rewardingTokenAmount, setRewardingTokenAmount] = useState('0');

  const ERC20Address = '0xf379252Ab964302Eb81eE83a429F32DCd121f71F'; 
  const StakingAddress = '0x8317A5fAe541C810358814CbDEF0835EDD921dba';

  useEffect(() => {
    if (window.ethereum) {
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);
    } else {
      alert('MetaMask is not installed. Please install it to use this app.');
    }
  }, []);

  useEffect(() => {
    const fetchBalances = async () => {
      if (account && web3) {
        const erc20Contract = new web3.eth.Contract(ERC20ABI, ERC20Address);
        
        // Fetch token balance
        const balance = await erc20Contract.methods.balanceOf(account).call();
        setTokenBalance(web3.utils.fromWei(balance, 'ether'));

        // Fetch staked amount
        const stakingContract = new web3.eth.Contract(StakingABI, StakingAddress);
        const staked = await stakingContract.methods.userAmount(ERC20Address, account).call();
        setStakedAmount(web3.utils.fromWei(staked, 'ether'));

        // Fetch rewarded amount
        const reward = await stakingContract.methods.calculateReceiveAmount(ERC20Address).call({ from: account });
        console.log("Reward : ",reward)
        setRewardAmount(web3.utils.fromWei(reward, 'ether'));

        //Fetch total invested amount 
        const investedAmount = await stakingContract.methods.tokenDetails(ERC20Address).call();
        setTotalInvestedAmount(web3.utils.fromWei(investedAmount.totalInvested, 'ether'));
      }
    };

    fetchBalances();
  }, [account, web3]);

  const connectWallet = async () => {
    if (web3) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);

        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x61',
            chainName: 'Binance Smart Chain Testnet',
            nativeCurrency: {
              name: 'BNB',
              symbol: 'BNB',
              decimals: 18,
            },
            rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
            blockExplorerUrls: ['https://testnet.bscscan.com'],
          }],
        });
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    }
  };

  const approveTokens = async () => {
    if (!account || !amount) {
      alert('Please connect your wallet and enter an amount!');
      return;
    }

    const contract = new web3.eth.Contract(ERC20ABI, ERC20Address);
    const value = web3.utils.toWei(amount, 'ether');

    try {
      const txHash = await contract.methods.approve(StakingAddress, value).send({ from: account });
      setTransactionHash(txHash.transactionHash);
      console.log('Approval Transaction Hash:', txHash.transactionHash);
    } catch (error) {
      console.error('Failed to approve tokens:', error);
    }
  };

  const stakeTokens = async () => {
    if (!account || !amount) {
      alert('Please connect your wallet and enter an amount!');
      return;
    }

    const contract = new web3.eth.Contract(StakingABI, StakingAddress);
    const value = web3.utils.toWei(amount, 'ether');
    console.log("Contract : ",contract)
    console.log("Value : ",value)

    try {
      const gasEstimate = await contract.methods.deposit(ERC20Address, value).estimateGas({ from: account });
      console.log('Estimated gas for staking:', gasEstimate);

      const txHash = await contract.methods.deposit(ERC20Address, value).send({ from: account, gas: gasEstimate });
      setTransactionHash(txHash.transactionHash);
      console.log('Staking Transaction Hash:', txHash.transactionHash);
      
      const newStaked = await contract.methods.userAmount(ERC20Address, account).call();
      setStakedAmount(web3.utils.fromWei(newStaked, 'ether'));
      
      const reward = await contract.methods.calculateReceiveAmount(ERC20Address).call({ from: account });
      setRewardAmount(web3.utils.fromWei(reward, 'ether'));
      
      const investedAmount = await contract.methods.tokenDetails(ERC20Address).call();
      setTotalInvestedAmount(web3.utils.fromWei(investedAmount.totalInvested, 'ether'));

    } catch (error) {
      console.error('Failed to stake tokens:', error);
    }
  };

  const unstakeTokens = async () => {
    if (!account || !unstakeAmount) {
      alert('Please connect your wallet and enter an amount to unstake!');
      return;
    }

    const parsedUnstakeAmount = web3.utils.toWei(unstakeAmount, 'ether');
    
    if (parseFloat(unstakeAmount) > parseFloat(stakedAmount)) {
      alert('You cannot unstake more than your staked amount!');
      return;
    }

    const contract = new web3.eth.Contract(StakingABI, StakingAddress);

    try {
      const gasEstimate = await contract.methods.withdraw(ERC20Address, parsedUnstakeAmount).estimateGas({ from: account });
      console.log('Estimated gas for unstaking:', gasEstimate);

      const txHash = await contract.methods.withdraw(ERC20Address, parsedUnstakeAmount).send({ from: account , gas: gasEstimate });
      setTransactionHash(txHash.transactionHash);
      console.log('Unstaking Transaction Hash:', txHash.transactionHash);

      const newStaked = await contract.methods.userAmount(ERC20Address, account).call();
      setStakedAmount(web3.utils.fromWei(newStaked, 'ether'));

      const reward = await contract.methods.calculateReceiveAmount(ERC20Address).call({ from: account });
      setRewardAmount(web3.utils.fromWei(reward, 'ether'));

      const investedAmount = await contract.methods.tokenDetails(ERC20Address).call();
      setTotalInvestedAmount(web3.utils.fromWei(investedAmount.totalInvested, 'ether'));
    } catch (error) {
      console.error('Failed to unstake tokens:', error);
    }
  };

  const mintTokens = async () => {
    if (!account || !mintAmount) {
      alert('Please connect your wallet and enter an amount to mint!');
      return;
    }

    const contract = new web3.eth.Contract(ERC20ABI, ERC20Address);
    const value = web3.utils.toWei(mintAmount, 'ether');

    try {
      const txHash = await contract.methods.mint(account, value).send({ from: account });
      setTransactionHash(txHash.transactionHash);
      console.log('Minting Transaction Hash:', txHash.transactionHash);
      
      const newBalance = await contract.methods.balanceOf(account).call();
      setTokenBalance(web3.utils.fromWei(newBalance, 'ether'));
    } catch (error) {
      console.error('Failed to mint tokens:', error);
    }
  };

  const rewardToken = async () => {
    if (!account || !rewardingTokenAmount) {
      alert('Please connect your wallet and enter an amount to reward!');
      return;
    }

    const contract = new web3.eth.Contract(StakingABI, StakingAddress);
    const value = web3.utils.toWei(rewardingTokenAmount, 'ether');
    console.log("Contract : ",contract)
    console.log("Value : ",value)    

    try {
      const gasEstimate = await contract.methods.addRewardTokens(ERC20Address, value).estimateGas({ from: account });
      console.log('Estimated gas for staking:', gasEstimate);

      const txHash = await contract.methods.addRewardTokens(ERC20Address, value).send({ from: account, gas: gasEstimate });
      setTransactionHash(txHash.transactionHash);
      console.log('Staking Transaction Hash:', txHash.transactionHash);
      
      const newStaked = await contract.methods.userAmount(ERC20Address, account).call();
      setStakedAmount(web3.utils.fromWei(newStaked, 'ether'));
      
      const reward = await contract.methods.calculateReceiveAmount(ERC20Address).call({ from: account });
      setRewardAmount(web3.utils.fromWei(reward, 'ether'));
      
      const investedAmount = await contract.methods.tokenDetails(ERC20Address).call();
      setTotalInvestedAmount(web3.utils.fromWei(investedAmount.totalInvested, 'ether'));

    } catch (error) {
      console.error('Failed to stake tokens:', error);
    }
  }

  return (
    <div style={{ display: 'flex', padding: '20px' }}>
      <div style={{ flex: 1 }}>
        <h1>Staking DApp</h1>
        {account ? (
          <p>Connected Account: {account}</p>
        ) : (
          <button onClick={connectWallet}>Connect MetaMask Wallet</button>
        )}
        <br />
        
        <p>Total Invested Amount : {totalInvestedAmount} Tokens</p>
        <p>Staked Amount: {stakedAmount} Tokens</p>
        <p>After Reward Amount: {rewardAmount} Tokens</p>

        {/*Staking section */}
        <h2>Stake Tokens</h2>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount to stake"
        />
        <br />
        <button onClick={approveTokens} disabled={!account}>
          Approve Tokens
        </button>
        <button onClick={stakeTokens} disabled={!account || !amount}>
          Stake Tokens
        </button>
        {transactionHash && <p>Transaction Hash: {transactionHash}</p>}

        {/* Unstake section */}
        <h2>Unstake Tokens</h2>
        <input
          type="text"
          value={unstakeAmount}
          onChange={(e) => setUnstakeAmount(e.target.value)}
          placeholder="Enter amount to unstake"
        />
        <button onClick={unstakeTokens} disabled={!account || !unstakeAmount}>
          Unstake Tokens
        </button>
      </div>

      <div style={{ marginLeft: '40px' }}>
        <h1>Help Yourself Section</h1>
        <h2>Mint some tokens</h2>
        <p>Current Balance: {tokenBalance} Tokens</p>
        <input
          type="text"
          value={mintAmount}
          onChange={(e) => setMintAmount(e.target.value)}
          placeholder="Enter amount to mint"
        />
        <button onClick={mintTokens} disabled={!account || !mintAmount}>
          Mint Tokens
        </button>
        <br/>
        <h2>Add Reward Tokens</h2>
        <input
          type="text"
          value={rewardingTokenAmount}
          onChange={(e) => setRewardingTokenAmount(e.target.value)}
          placeholder="Enter amount to reward"
        />
        <button onClick={rewardToken} disabled={!account || !rewardingTokenAmount}>
          Reward
        </button>
      </div>
    </div>
  );
};

export default App;
