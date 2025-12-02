// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ControlStructures - exercise contract for Base Learn Control Structures
contract ControlStructures {
    // кастомная ошибка для "нерабочего времени"
    error AfterHours(uint256 time);

    /// @notice Классический FizzBuzz
    /// @return "Fizz", "Buzz", "FizzBuzz" или "Splat"
    function fizzBuzz(uint256 _number) external pure returns (string memory) {
        if (_number % 15 == 0) {
            return "FizzBuzz";
        } else if (_number % 3 == 0) {
            return "Fizz";
        } else if (_number % 5 == 0) {
            return "Buzz";
        } else {
            return "Splat";
        }
    }

    /// @notice Режим "не беспокоить" по времени вида 0830, 2230 и т.д.
    /// Логика как в задании Base:
    /// - если _time >= 2400 -> panic (assert)
    /// - если _time > 2200 или _time < 800 -> revert AfterHours(_time)
    /// - если 1200 <= _time <= 1259 -> revert("At lunch!")
    /// - 800..1199  -> "Morning!"
    /// - 1300..1799 -> "Afternoon!"
    /// - 1800..2200 -> "Evening!"
    function doNotDisturb(uint256 _time)
        external
        pure
        returns (string memory)
    {
        // 1) Паника, если время вообще некорректное (>= 2400)
        assert(_time < 2400);

        // 2) Слишком рано или слишком поздно — кастомная ошибка
        if (_time > 2200 || _time < 800) {
            revert AfterHours(_time);
        }

        // 3) Обед — отдельный кейс с текстом
        if (_time >= 1200 && _time <= 1259) {
            revert("At lunch!");
        }

        // 4) Рабочие промежутки с разными ответами
        if (_time >= 800 && _time <= 1199) {
            return "Morning!";
        }

        if (_time >= 1300 && _time <= 1799) {
            return "Afternoon!";
        }

        if (_time >= 1800 && _time <= 2200) {
            return "Evening!";
        }

        // Теоретически сюда не попадём, но компилятор просит return
        return "";
    }
}
