// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract UnburnableToken {
    // Балансы пользователей
    mapping(address => uint) public balances;

    // Всего токенов
    uint public totalSupply;

    // Сколько токенов уже роздано через claim()
    uint public totalClaimed;

    // Кто уже клеймил
    mapping(address => bool) private claimedAddresses;

    // Сколько выдаём за один claim
    uint constant MAX_CLAIM_AMOUNT = 1000;

    // Ошибки по заданию
    error TokensClaimed();
    error AllTokensClaimed();
    error UnsafeTransfer(address _to);

    constructor() {
        totalSupply = 100_000_000;
    }

    // Любой адрес может ОДИН РАЗ получить 1000 токенов
    function claim() public {
        // Если уже всё роздано — реверт
        if (totalClaimed >= totalSupply) {
            revert AllTokensClaimed();
        }

        // Если этот адрес уже клеймил — реверт
        if (claimedAddresses[msg.sender]) {
            revert TokensClaimed();
        }

        // Отмечаем, что этот адрес уже забрал свою порцию
        claimedAddresses[msg.sender] = true;

        // Увеличиваем счётчики
        totalClaimed += MAX_CLAIM_AMOUNT;
        balances[msg.sender] += MAX_CLAIM_AMOUNT;
    }

    // Безопасный трансфер
    function safeTransfer(address _to, uint _amount) public {
        // Нельзя отправлять:
        //  - на нулевой адрес
        //  - на адрес без ETH на Base Sepolia
        if (_to == address(0) || _to.balance == 0) {
            revert UnsafeTransfer(_to);
        }

        require(balances[msg.sender] >= _amount, "Insufficient balance");

        balances[msg.sender] -= _amount;
        balances[_to] += _amount;
    }
}
