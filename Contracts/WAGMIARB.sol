// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/ILendingPool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract ArbitrageBot is FlashLoanReceiverBase {
    // using SafeMath for uint256;

    address public owner;
    address public constant UNISWAP_ROUTER = 0x7a250d5630B9726161472e5b4e5D9c2dA6d7C5a0; // Sepolia Uniswap V2
    address public constant SUSHISWAP_ROUTER = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506; // Sepolia SushiSwap
    uint256 constant DEADLINE = 300; // 5 minutes

    constructor(address _lendingPoolAddressesProvider) FlashLoanReceiverBase(_lendingPoolAddressesProvider) {
        owner = msg.sender;
    }

    // Initiates flash loan
    function executeArbitrage(
        address tokenBorrow,
        uint256 amount,
        address tokenSell,
        uint256 amountOutMin,
        address[] memory pathUniswap,
        address[] memory pathSushiSwap
    ) external {
        require(msg.sender == owner, "Only owner");
        bytes memory data = abi.encode(tokenSell, amountOutMin, pathUniswap, pathSushiSwap);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        ILendingPool lendingPool = ILendingPool(ADDRESSES_PROVIDER.getLendingPool());
        lendingPool.flashLoan(address(this), tokenBorrow, amounts, data);
    }

    // Aave flash loan callback
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == ADDRESSES_PROVIDER.getLendingPool(), "Invalid caller");
        (address tokenSell, uint256 amountOutMin, address[] memory pathUniswap, address[] memory pathSushiSwap) = 
            abi.decode(params, (address, uint256, address[], address[]));

        // Approve tokens for Uniswap and SushiSwap
        IERC20(assets[0]).approve(UNISWAP_ROUTER, amounts[0]);
        IERC20(assets[0]).approve(SUSHISWAP_ROUTER, amounts[0]);

        // Execute trade on Uniswap: Buy tokenSell
        IUniswapV2Router(UNISWAP_ROUTER).swapExactTokensForTokens(
            amounts[0],
            0,
            pathUniswap,
            address(this),
            block.timestamp + DEADLINE
        );

        // Approve tokenSell for SushiSwap
        uint256 balance = IERC20(tokenSell).balanceOf(address(this));
        IERC20(tokenSell).approve(SUSHISWAP_ROUTER, balance);

        // Execute trade on SushiSwap: Sell tokenSell
        uint256[] memory amountsOut = IUniswapV2Router(SUSHISWAP_ROUTER).swapExactTokensForTokens(
            balance,
            amountOutMin,
            pathSushiSwap,
            address(this),
            block.timestamp + DEADLINE
        );

        // Calculate repayment and profit
        uint256 amountOwed = amounts[0] + premiums[0];
        require(IERC20(assets[0]).balanceOf(address(this)) >= amountOwed, "Insufficient funds to repay loan");

        // Approve repayment to Aave
        IERC20(assets[0]).approve(address(ADDRESSES_PROVIDER.getLendingPool()), amountOwed);

        return true;
    }

    // Withdraw profits
    function withdraw(address token) external {
        require(msg.sender == owner, "Only owner");
        IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this)));
    }

    // Emergency stop
    function emergencyStop() external {
        require(msg.sender == owner, "Only owner");
        selfdestruct(payable(owner));
    }
}