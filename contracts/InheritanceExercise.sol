// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// -------------------------
// Базовый абстрактный Employee
// -------------------------
abstract contract Employee {
    uint public idNumber;
    uint public managerId;

    constructor(uint _idNumber, uint _managerId) {
        idNumber = _idNumber;
        managerId = _managerId;
    }

    function getAnnualCost() public view virtual returns (uint);
}

// -------------------------
// Salaried
// -------------------------
contract Salaried is Employee {
    uint public annualSalary;

    constructor(
        uint _idNumber,
        uint _managerId,
        uint _annualSalary
    ) Employee(_idNumber, _managerId) {
        annualSalary = _annualSalary;
    }

    function getAnnualCost() public view override returns (uint) {
        return annualSalary;
    }
}

// -------------------------
// Hourly
// -------------------------
contract Hourly is Employee {
    uint public hourlyRate;

    constructor(
        uint _idNumber,
        uint _managerId,
        uint _hourlyRate
    ) Employee(_idNumber, _managerId) {
        hourlyRate = _hourlyRate;
    }

    // годовая стоимость = ставка * 2080 часов
    function getAnnualCost() public view override returns (uint) {
        return hourlyRate * 2080;
    }
}

// -------------------------
// Manager (только массив репортов)
// -------------------------
contract Manager {
    uint[] public employeeIds;

    function addReport(uint _employeeId) public {
        employeeIds.push(_employeeId);
    }

    function resetReports() public {
        delete employeeIds;
    }
}

// -------------------------
// Salesperson — наследует Hourly
// -------------------------
contract Salesperson is Hourly {
    constructor(
        uint _idNumber,
        uint _managerId,
        uint _hourlyRate
    ) Hourly(_idNumber, _managerId, _hourlyRate) {}
}

// -------------------------
// EngineeringManager — наследует Salaried и Manager
// -------------------------
contract EngineeringManager is Salaried, Manager {
    constructor(
        uint _idNumber,
        uint _managerId,
        uint _annualSalary
    ) Salaried(_idNumber, _managerId, _annualSalary) {}
}

// -------------------------
// InheritanceSubmission — как в задании Base
// -------------------------
contract InheritanceSubmission {
    address public salesPerson;
    address public engineeringManager;

    constructor(address _salesPerson, address _engineeringManager) {
        salesPerson = _salesPerson;
        engineeringManager = _engineeringManager;
    }
}
