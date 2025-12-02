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

    // Складывает числа и возвращает (сумма, произошла_ли_ошибка_переполнения)
    function adder(uint256 a, uint256 b)
        external
        pure
        returns (uint256 sum, bool error)
    {
        unchecked {
            sum = a + b;
        }

        // Если переполнение: сумма меньше одного из слагаемых
        if (sum < a) {
            return (0, true);
        }

        return (sum, false);
    }

    // Вычитает и возвращает (разность, произошла_ли_ошибка_underflow)
    function subtractor(uint256 a, uint256 b)
        external
        pure
        returns (uint256 difference, bool error)
    {
        // если пытаемся вычесть больше, чем есть — считаем это ошибкой
        if (b > a) {
            return (0, true);
        }

        unchecked {
            difference = a - b;
        }

        return (difference, false);
    }
}
