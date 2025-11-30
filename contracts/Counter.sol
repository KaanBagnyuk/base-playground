// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Простой счётчик
contract Counter {
    // Храним число в блокчейне
    uint256 public count;

    // Событие, которое будет логироваться при изменении
    event CountChanged(uint256 newCount);

    // Увеличить count на 1
    function increment() external {
        count += 1;
        emit CountChanged(count);
    }

    // Явно установить count в заданное значение
    function set(uint256 newCount) external {
        count = newCount;
        emit CountChanged(count);
    }
}
