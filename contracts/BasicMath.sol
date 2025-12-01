// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title BasicMath - simple math helper contract for learning
contract BasicMath {
    // Складывает два числа
    function add(uint256 a, uint256 b) external pure returns (uint256) {
        return a + b;
    }

    // Вычитает b из a
    function subtract(uint256 a, uint256 b) external pure returns (uint256) {
        return a - b;
    }

    // Умножает два числа
    function multiply(uint256 a, uint256 b) external pure returns (uint256) {
        return a * b;
    }

    // Делит a на b (целочисленное деление)
    function divide(uint256 a, uint256 b) external pure returns (uint256) {
        require(b != 0, "Cannot divide by zero");
        return a / b;
    }
}
