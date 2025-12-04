// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // или твоя версия, но >= 0.8.20

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interface for interacting with a submission contract
interface ISubmission {
    // Struct representing a haiku
    struct Haiku {
        address author; // Address of the haiku author
        string line1;   // First line of the haiku
        string line2;   // Second line of the haiku
        string line3;   // Third line of the haiku
    }

    // Function to mint a new haiku
    function mintHaiku(
        string memory _line1,
        string memory _line2,
        string memory _line3
    ) external;

    // Function to get the total number of haikus
    function counter() external view returns (uint256);

    // Function to share a haiku with another address
    function shareHaiku(uint256 _id, address _to) external;

    // Function to get haikus shared with the caller
    function getMySharedHaikus() external view returns (Haiku[] memory);
}

// Custom errors
error HaikuNotUnique();   // Error for attempting to mint a non-unique haiku
error NotYourHaiku();     // Error for attempting to share a haiku not owned by the caller
error NoHaikusShared();   // Error for no haikus shared with the caller

// Contract for managing Haiku NFTs
contract HaikuNFT is ERC721, ISubmission {
    // Array to store haikus
    Haiku[] public haikus;

    // Mapping to track shared haikus: sharedHaikus[receiver][haikuId] = true/false
    mapping(address => mapping(uint256 => bool)) public sharedHaikus;

    // Counter for total haikus minted (и он же "следующий id")
    uint256 public haikuCounter;

    // "Соль" — во многих задачах Base используют именно это значение
    string private salt = "pudgy";

    // Constructor to initialize the ERC721 contract
    constructor() ERC721("HaikuNFT", "HAIKU") {
        // haikuCounter по умолчанию = 0
    }

    // Возвращает общее количество хайку
    function counter() external view override returns (uint256) {
        return haikuCounter;
    }

    // Function to mint a new haiku
    function mintHaiku(
        string memory _line1,
        string memory _line2,
        string memory _line3
    ) external override {
        // 1. Проверяем уникальность (ни одна из строк не совпадает с уже существующими)
        string[3] memory haikusStrings = [_line1, _line2, _line3];

        for (uint256 li = 0; li < haikusStrings.length; li++) {
            string memory newLine = haikusStrings[li];

            for (uint256 i = 0; i < haikus.length; i++) {
                Haiku memory existingHaiku = haikus[i];

                string[3] memory existingHaikuStrings = [
                    existingHaiku.line1,
                    existingHaiku.line2,
                    existingHaiku.line3
                ];

                for (uint256 eHsi = 0; eHsi < 3; eHsi++) {
                    string memory existingHaikuString = existingHaikuStrings[eHsi];

                    if (
                        keccak256(abi.encodePacked(existingHaikuString)) ==
                        keccak256(abi.encodePacked(newLine))
                    ) {
                        revert HaikuNotUnique();
                    }
                }
            }
        }

        // 2. mint NFT: id = текущий haikuCounter (0,1,2,…)
        uint256 tokenId = haikuCounter;
        _safeMint(msg.sender, tokenId);

        // 3. сохраняем данные
        haikus.push(Haiku(msg.sender, _line1, _line2, _line3));

        // 4. увеличиваем счётчик
        haikuCounter++;
    }

    // Function to share a haiku with another address
    function shareHaiku(uint256 _id, address _to) external override {
        // _id — это индекс в массиве, и он же tokenId, поэтому:
        require(_id < haikuCounter, "Invalid haiku ID");

        Haiku memory haikuToShare = haikus[_id];

        if (haikuToShare.author != msg.sender) {
            revert NotYourHaiku();
        }

        sharedHaikus[_to][_id] = true;
    }

    // Function to get haikus shared with the caller
    function getMySharedHaikus()
        external
        view
        override
        returns (Haiku[] memory)
    {
        uint256 sharedHaikuCount;

        // Считаем, сколько хайку расшарено этому юзеру
        for (uint256 i = 0; i < haikus.length; i++) {
            if (sharedHaikus[msg.sender][i]) {
                sharedHaikuCount++;
            }
        }

        if (sharedHaikuCount == 0) {
            revert NoHaikusShared();
        }

        Haiku[] memory result = new Haiku[](sharedHaikuCount);
        uint256 currentIndex;

        for (uint256 i = 0; i < haikus.length; i++) {
            if (sharedHaikus[msg.sender][i]) {
                result[currentIndex] = haikus[i];
                currentIndex++;
            }
        }

        return result;
    }
}
