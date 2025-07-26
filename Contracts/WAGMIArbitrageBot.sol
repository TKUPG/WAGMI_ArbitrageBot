// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanReceiverBase.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface IExchange {
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) external returns (uint256);
}

contract ArbitrageBot is FlashLoanReceiverBase {
    using SafeMath for uint256;

    address public owner;
    address public constant AAVE_LENDING_POOL = 0xE4eDb277e41dc89aB076a1F049f4a3EfA700bCE8; // Sepolia Aave

    constructor(address _lendingPoolAddressesProvider) FlashLoanReceiverBase(_lendingPoolAddressesProvider) {
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
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        ILendingPool lendingPool = ILendingPool(ADDRESSES_PROVIDER.getLendingPool());
        lendingPool.flashLoan(address(this), tokenBorrow, amounts, data);
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == ADDRESSES_PROVIDER.getLendingPool(), "Invalid caller");
        (address exchange1, address exchange2, address tokenSell, uint256 amountOutMin) = 
            abi.decode(params, (address, address, address, uint256));

        // Approve tokens for exchanges
        IERC20(assets[0]).approve(exchange1, amounts[0]);
        IERC20(assets[0]).approve(exchange2, amounts[0]);

        // Buy on exchange1
        uint256 amountReceived = IExchange(exchange1).swap(assets[0], tokenSell, amounts[0], 0);

        // Approve tokenSell for exchange2
        IERC20(tokenSell).approve(exchange2, amountReceived);

        // Sell on exchange2
        uint256 amountOut = IExchange(exchange2).swap(tokenSell, assets[0], amountReceived, amountOutMin);

        // Ensure profitability
        uint256 amountOwed = amounts[0].add(premiums[0]);
        require(amountOut >= amountOwed, "Unprofitable trade");

        // Approve repayment to Aave
        IERC20(assets[0]).approve(address(ADDRESSES_PROVIDER.getLendingPool()), amountOwed);

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