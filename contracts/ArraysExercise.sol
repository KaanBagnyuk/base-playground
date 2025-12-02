// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ArraysExercise {
    // Массив чисел 1–10, как в задании
    uint[] public numbers = [1,2,3,4,5,6,7,8,9,10];

    // Массивы для хранения отправителей и таймстампов
    address[] public senders;
    uint[] public timestamps;

    // --- Return a Complete Array ---

    function getNumbers() public view returns (uint[] memory) {
        return numbers;
    }

    // --- Reset Numbers ---

    // Сбрасываем numbers обратно к 1..10
    // Без .push() — просто присваиваем литерал массиву
    function resetNumbers() public {
        numbers = [1,2,3,4,5,6,7,8,9,10];
    }

    // --- Append to an Existing Array ---

    // Добавляем элементы из _toAppend в конец numbers
    function appendToNumbers(uint[] calldata _toAppend) public {
        for (uint i = 0; i < _toAppend.length; i++) {
            numbers.push(_toAppend[i]);
        }
    }

    // --- Timestamp Saving ---

    // Сохраняем отправителя и его таймстамп
    function saveTimestamp(uint _unixTimestamp) public {
        senders.push(msg.sender);
        timestamps.push(_unixTimestamp);
    }

    // --- Timestamp Filtering (after Y2K) ---

    // Возвращает:
    // 1) массив таймстампов > 946702800
    // 2) массив адресов-отправителей для этих таймстампов
    function afterY2K()
        public
        view
        returns (uint[] memory, address[] memory)
    {
        uint256 count = 0;

        // Сначала считаем, сколько подходящих элементов
        for (uint256 i = 0; i < timestamps.length; i++) {
            if (timestamps[i] > 946702800) {
                count++;
            }
        }

        // Теперь создаём memory-массивы нужной длины
        uint[] memory filteredTimestamps = new uint[](count);
        address[] memory filteredSenders = new address[](count);

        uint256 j = 0;
        for (uint256 i = 0; i < timestamps.length; i++) {
            if (timestamps[i] > 946702800) {
                filteredTimestamps[j] = timestamps[i];
                filteredSenders[j] = senders[i];
                j++;
            }
        }

        return (filteredTimestamps, filteredSenders);
    }

    // --- Resets ---

    function resetSenders() public {
        delete senders;
    }

    function resetTimestamps() public {
        delete timestamps;
    }
}
