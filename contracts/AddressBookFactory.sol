// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AddressBook.sol";

contract AddressBookFactory {
    event AddressBookDeployed(address indexed owner, address indexed addressBook);

    // Функция, которая создаёт новую AddressBook и делает msg.sender её владельцем
    function deploy() external returns (address) {
        AddressBook book = new AddressBook(msg.sender);
        emit AddressBookDeployed(msg.sender, address(book));
        return address(book);
    }
}
