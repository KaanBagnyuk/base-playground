// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title FavoriteRecords
 * @dev Контракт для списка одобренных альбомов и избранного пользователей
 */
contract FavoriteRecords {
    // mapping "название альбома -> одобрен ли он"
    mapping(string => bool) private approvedRecords;

    // массив всех одобренных альбомов (нужен, чтобы их вернуть списком)
    string[] private approvedRecordsIndex;

    // mapping "адрес пользователя -> (название альбома -> избранное?)"
    mapping(address => mapping(string => bool)) public userFavorites;

    // mapping "адрес пользователя -> список названий альбомов-избранных"
    mapping(address => string[]) private userFavoritesIndex;

    // кастомная ошибка, если альбом не одобрен
    error NotApproved(string albumName);

    /**
     * @dev Конструктор — заполняет approvedRecords и индекс
     */
    constructor() {
        approvedRecordsIndex = [
            "Thriller",
            "Back in Black",
            "The Bodyguard",
            "The Dark Side of the Moon",
            "Their Greatest Hits (1971-1975)",
            "Hotel California",
            "Come On Over",
            "Rumours",
            "Saturday Night Fever"
        ];

        for (uint256 i = 0; i < approvedRecordsIndex.length; i++) {
            approvedRecords[approvedRecordsIndex[i]] = true;
        }
    }

    /**
     * @dev Вернуть список всех одобренных альбомов
     */
    function getApprovedRecords() public view returns (string[] memory) {
        return approvedRecordsIndex;
    }

    /**
     * @dev Добавить альбом в избранное отправителя
     * @param _albumName название альбома
     */
    function addRecord(string memory _albumName) public {
        // если альбом не одобрен — швыряем NotApproved
        if (!approvedRecords[_albumName]) {
            revert NotApproved({albumName: _albumName});
        }

        // если ещё не в избранном у этого пользователя — добавляем
        if (!userFavorites[msg.sender][_albumName]) {
            userFavorites[msg.sender][_albumName] = true;
            userFavoritesIndex[msg.sender].push(_albumName);
        }
    }

    /**
     * @dev Получить список избранных альбомов пользователя
     */
    function getUserFavorites(address _user)
        public
        view
        returns (string[] memory)
    {
        return userFavoritesIndex[_user];
    }

    /**
     * @dev Сбросить свой список избранных альбомов
     */
    function resetUserFavorites() public {
        // проходим по текущим избранным и чистим mapping
        for (uint256 i = 0; i < userFavoritesIndex[msg.sender].length; i++) {
            delete userFavorites[msg.sender][userFavoritesIndex[msg.sender][i]];
        }
        // очищаем массив избранных
        delete userFavoritesIndex[msg.sender];
    }
}
