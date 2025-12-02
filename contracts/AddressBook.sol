// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

error ContactNotFound(uint256 id);

contract AddressBook is Ownable {
    struct Contact {
        uint256 id;
        string firstName;
        string lastName;
        uint256[] phoneNumbers;
    }

    // id → контакт
    mapping(uint256 => Contact) private contacts;

    // id → существует ли контакт (true/false)
    mapping(uint256 => bool) private contactExists;

    // список всех id, чтобы можно было вернуть все контакты
    uint256[] private contactIds;

    // Передаём владельца в Ownable
    constructor(address initialOwner) Ownable(initialOwner) {}

    // Только owner может добавлять/обновлять контакт
    function addContact(
        uint256 _id,
        string calldata _firstName,
        string calldata _lastName,
        uint256[] calldata _phoneNumbers
    ) external onlyOwner {
        // если контакт с таким id ещё не был добавлен — добавляем id в список
        if (!contactExists[_id]) {
            contactIds.push(_id);
            contactExists[_id] = true;
        }

        contacts[_id] = Contact({
            id: _id,
            firstName: _firstName,
            lastName: _lastName,
            phoneNumbers: _phoneNumbers
        });
    }

    // Только owner может удалять контакт
    function deleteContact(uint256 _id) external onlyOwner {
        if (!contactExists[_id]) {
            revert ContactNotFound(_id);
        }

        delete contacts[_id];
        contactExists[_id] = false;
        // id из массива contactIds не убираем, будем фильтровать в getAllContacts
    }

    // Возвращаем один контакт по id
    function getContact(uint256 _id) external view returns (Contact memory) {
        if (!contactExists[_id]) {
            revert ContactNotFound(_id);
        }
        return contacts[_id];
    }

    // Возвращаем все НЕудалённые контакты
    function getAllContacts() external view returns (Contact[] memory) {
        uint256 len = contactIds.length;
        uint256 count;

        // сначала считаем, сколько живых контактов
        for (uint256 i = 0; i < len; i++) {
            if (contactExists[contactIds[i]]) {
                count++;
            }
        }

        Contact[] memory result = new Contact[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < len; i++) {
            uint256 id = contactIds[i];
            if (contactExists[id]) {
                result[index] = contacts[id];
                index++;
            }
        }

        return result;
    }
}
