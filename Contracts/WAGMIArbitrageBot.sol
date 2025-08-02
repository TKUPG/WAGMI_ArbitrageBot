// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IExchange {
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) external returns (uint256);
}

contract ArbitrageBot is FlashLoanSimpleReceiverBase {
    address public immutable owner;

    constructor(address _poolAddressesProvider) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_poolAddressesProvider)) {
        owner = msg.sender;
    }

    function executeArbitrage(
        address tokenBorrow,
        uint256 amount,
        address exchange1,
        address exchange2,
        address tokenSell,
        uint256 amountOutMin
    ) external {
        require(msg.sender == owner, "Only owner");
        bytes memory data = abi.encode(exchange1, exchange2, tokenSell, amountOutMin);
        
        POOL.flashLoanSimple(
            address(this),
            tokenBorrow,
            amount,
            data,
            0
        );
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "Invalid caller");
        (address exchange1, address exchange2, address tokenSell, uint256 amountOutMin) = 
            abi.decode(params, (address, address, address, uint256));

        IERC20(asset).approve(exchange1, amount);
        uint256 amountReceived = IExchange(exchange1).swap(asset, tokenSell, amount, 0);

        IERC20(tokenSell).approve(exchange2, amountReceived);
        uint256 amountOut = IExchange(exchange2).swap(tokenSell, asset, amountReceived, amountOutMin);

        uint256 amountOwed = amount + premium;
        require(amountOut >= amountOwed, "Unprofitable trade");

        IERC20(asset).approve(address(POOL), amountOwed);
        return true;
    }

    function withdraw(address token) external {
        require(msg.sender == owner, "Only owner");
        IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this)));
    }

    function emergencyStop() external {
        require(msg.sender == owner, "Only owner");
        selfdestruct(payable(owner));
    }
}