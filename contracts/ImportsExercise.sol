// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./SillyStringUtils.sol";

/// @title ImportsExercise - контракт для упражнения Base Learn (Imports)
contract ImportsExercise {
    // Необязательная «соль», просто уникальная строка внутри контракта
    string private salt = "vibe-dev-starknetvm.base.eth";

    // Публичное хайку, как требует задание
    SillyStringUtils.Haiku public haiku;

    // Делаем так, чтобы любой string мог вызывать .shruggie()
    using SillyStringUtils for string;

    // --- Save Haiku ---
    // Сохраняем три строки в структуру haiku
    function saveHaiku(
        string calldata line1,
        string calldata line2,
        string calldata line3
    ) public {
        haiku = SillyStringUtils.Haiku({
            line1: line1,
            line2: line2,
            line3: line3
        });
    }

    // --- Get Haiku ---
    // Возвращаем всё хайку как тип Haiku
    function getHaiku() public view returns (SillyStringUtils.Haiku memory) {
        return haiku;
    }

    // --- Shruggie Haiku ---
    // Возвращаем копию хайку, в которой к line3 добавлен шраг.
    // ОРИГИНАЛЬНОЕ haiku НЕ меняем.
    function shruggieHaiku() public view returns (SillyStringUtils.Haiku memory) {
        // Берём копию текущего хайку в память
        SillyStringUtils.Haiku memory copy = haiku;

        // Меняем только line3, используя библиотеку (метод .shruggie())
        copy.line3 = copy.line3.shruggie();

        // Возвращаем изменённую копию
        return copy;
    }
}
