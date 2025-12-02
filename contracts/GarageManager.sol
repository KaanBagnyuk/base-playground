// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title GarageManager - exercise contract for Base Learn Structs
contract GarageManager {
    // --- Структура Car ---

    struct Car {
        string make;
        string model;
        string color;
        uint8 numberOfDoors;
    }

    // --- Хранилище гаражей пользователей ---

    // mapping: адрес -> массив машин
    mapping(address => Car[]) public garage;

    // Кастомная ошибка для неверного индекса машины
    error BadCarIndex(uint256 index);

    // --- Добавить машину в свой гараж ---

    function addCar(
        string memory _make,
        string memory _model,
        string memory _color,
        uint8 _numberOfDoors
    ) public {
        Car memory newCar = Car({
            make: _make,
            model: _model,
            color: _color,
            numberOfDoors: _numberOfDoors
        });

        garage[msg.sender].push(newCar);
    }

    // --- Получить все свои машины ---

    function getMyCars() public view returns (Car[] memory) {
        return garage[msg.sender];
    }

    // --- Получить все машины любого пользователя ---

    function getUserCars(address _user)
        public
        view
        returns (Car[] memory)
    {
        return garage[_user];
    }

    // --- Обновить машину по индексу ---

    function updateCar(
        uint256 _index,
        string memory _make,
        string memory _model,
        string memory _color,
        uint8 _numberOfDoors
    ) public {
        Car[] storage cars = garage[msg.sender];

        if (_index >= cars.length) {
            revert BadCarIndex(_index);
        }

        cars[_index] = Car({
            make: _make,
            model: _model,
            color: _color,
            numberOfDoors: _numberOfDoors
        });
    }

    // --- Сбросить весь свой гараж ---

    function resetMyGarage() public {
        delete garage[msg.sender];
    }
}
