// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract EmployeeStorage {
    // ---- State variables (упакованы) ----
    uint16 private shares;   // 0..5000
    uint32 private salary;   // 0..1_000_000
    uint256 public idNumber;
    string public name;

    // ---- Constructor ----
    constructor(
        uint16 _shares,
        string memory _name,
        uint32 _salary,
        uint256 _idNumber
    ) {
        shares = _shares;
        name = _name;
        salary = _salary;
        idNumber = _idNumber;
    }

    // ---- View функции ----
    function viewShares() public view returns (uint16) {
        return shares;
    }

    function viewSalary() public view returns (uint32) {
        return salary;
    }

    // ---- Кастомная ошибка ----
    error TooManyShares(uint16 _shares);

    // ---- grantShares ----
    //
    // Если _newShares > 5000  -> revert("Too many shares")
    // Если shares + _newShares > 5000 -> revert TooManyShares(...)
    function grantShares(uint16 _newShares) public {
        if (_newShares > 5000) {
            revert("Too many shares");
        } else if (shares + _newShares > 5000) {
            revert TooManyShares(shares + _newShares);
        }

        shares += _newShares;
    }

    /**
    * Do not modify this function.  It is used to enable the unit test for this pin
    * to check whether or not you have configured your storage variables to make
    * use of packing.
    *
    * If you wish to cheat, simply modify this function to always return `0`
    * I'm not your boss ¯\_(ツ)_/¯
    *
    * Fair warning though, if you do cheat, it will be on the blockchain having been
    * deployed by your wallet....FOREVER!
    */
    function checkForPacking(uint _slot) public view returns (uint r) {
        assembly {
            r := sload(_slot)
        }
    }

    /**
    * Warning: Anyone can use this function at any time!
    */
    function debugResetShares() public {
        shares = 1000;
    }
}
