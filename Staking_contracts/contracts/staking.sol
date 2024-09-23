// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Staking is Ownable {
    uint constant public BASEPOINTS = 10000;
    
    struct Token {
        bool isWhitelisted;
        uint index;
        uint totalInvested;
        uint totalTransactionReceipt;
    }

    mapping(address => Token) public tokenDetails;
    mapping(address => mapping(address => uint)) public userAmount; //token => user => amount
    mapping(address => mapping(address => uint)) public userTransactionReceipt; //token => user => amt

    event TokenAdded(address token);
    event Stake(address indexed token, address user, uint amount);
    event Unstake(address indexed token, address user, uint amount);
    event RewardAdded(address token, uint amount);

    constructor() Ownable(msg.sender) {
    }

    function addToken(IERC20 token) public onlyOwner {
        require(!tokenDetails[address(token)].isWhitelisted,"already whitelisted");
        tokenDetails[address(token)] = Token({
            isWhitelisted : true,
            index : 10000,
            totalInvested : 0,
            totalTransactionReceipt : 0
        });
        emit TokenAdded(address(token));
    }

    function addRewardTokens(address token, uint amount) public {
        // userAmount[msg.sender] += amount;
        Token storage stakeToken = tokenDetails[token];
        stakeToken.totalInvested += amount;
        stakeToken.index = (stakeToken.totalInvested * BASEPOINTS) / stakeToken.totalTransactionReceipt;
        transferTokens(token, amount);
        emit RewardAdded(token, amount);
    }

    function deposit(address token, uint amount) public {
        Token storage stakeToken = tokenDetails[token];
        userAmount[token][msg.sender] += amount;
        stakeToken.totalInvested += amount;
            uint receiptValue = (amount * BASEPOINTS)/stakeToken.index;
            userTransactionReceipt[token][msg.sender] += receiptValue;
            stakeToken.totalTransactionReceipt += receiptValue;
        stakeToken.index = (stakeToken.totalInvested * BASEPOINTS) / stakeToken.totalTransactionReceipt;
        transferTokens(token, amount);
        emit Stake(token, msg.sender, amount);
    }

    function withdraw(address token, uint amount) public {
        require(amount <= userTransactionReceipt[token][msg.sender], "Invalid amount");
        Token storage stakedToken = tokenDetails[token];
        userAmount[token][msg.sender] -= amount;
        stakedToken.totalInvested -= amount;
            uint receiptValue = (amount * BASEPOINTS)/stakedToken.index;
            userTransactionReceipt[token][msg.sender] -= receiptValue;
            stakedToken.totalTransactionReceipt -= receiptValue;
        stakedToken.index = (stakedToken.totalInvested * BASEPOINTS) / stakedToken.totalTransactionReceipt;
        IERC20(token).transfer(msg.sender,amount);
        emit Unstake(token, msg.sender, amount);
    }
    function transferTokens(address _token, uint amount) internal {
        IERC20(_token).transferFrom(msg.sender, address(this), amount);
    }

    function calculateReceiveAmount(address token) public view returns(uint) {
        return (tokenDetails[token].index * userTransactionReceipt[token][msg.sender])/BASEPOINTS;
    }
}