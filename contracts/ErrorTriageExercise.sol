// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract ErrorTriageExercise {
    /**
     * Finds the difference between each uint with its neighbor (a to b, b to c, etc.)
     * and returns a uint array with the absolute integer difference of each pairing.
     */
    function diffWithNeighbor(
    uint _a,
    uint _b,
    uint _c,
    uint _d
) public pure returns (uint[] memory) {
    uint[] memory results = new uint[](3);

    // |a - b|
    if (_a >= _b) {
        results[0] = _a - _b;
    } else {
        results[0] = _b - _a;
    }

    // |b - c|
    if (_b >= _c) {
        results[1] = _b - _c;
    } else {
        results[1] = _c - _b;
    }

    // |c - d|
    if (_c >= _d) {
        results[2] = _c - _d;
    } else {
        results[2] = _d - _c;
    }

    return results;
}

    /**
     * Changes the _base by the value of _modifier.
     * Base is always >= 1000. Modifiers can be between positive and negative 100.
     */
    function applyModifier(
        uint _base,
        int _modifier
    ) public pure returns (uint) {
        // Складываем в знаковом виде, чтобы корректно работать с отрицательными модификаторами
        int signedBase = int(_base);          // 1000 -> 1000 (int)
        int result = signedBase + _modifier;  // например 1000 + (-50) = 950

        require(result >= 0, "Result underflow");

        return uint(result);                  // приводим обратно к uint
    }

    /**
     * Pop the last element from the supplied array, and return the popped value
     * (unlike the built-in function).
     */
    uint[] public arr;

    function popWithReturn() public returns (uint) {
        require(arr.length > 0, "Array is empty");

        uint lastIndex = arr.length - 1;
        uint value = arr[lastIndex];

        // реально уменьшаем длину массива
        arr.pop();

        return value;
    }

    // Utility-функции (как в твоём варианте)
    function addToArr(uint _num) public {
        arr.push(_num);
    }

    function getArr() public view returns (uint[] memory) {
        return arr;
    }

    function resetArr() public {
        delete arr;
    }
}
