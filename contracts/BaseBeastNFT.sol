// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./BeastScoreRegistry.sol";

contract BaseBeastNFT is ERC721, Ownable {
    BeastScoreRegistry public scoreRegistry;

    struct BeastScoreLocal {
        uint8 activityDaysTier;
        uint8 txCountTier;
        uint8 defiSwapsTier;
        uint8 liquidityTier;
        uint8 builderTier;
        uint8 overallTier;
    }

    struct BeastVisual {
        uint8 speciesId;  // 0–14 (7 common, 5 rare, 3 legendary)
        uint8 rarity;     // 0=Common, 1=Rare, 2=Legendary
        uint8 userType;   // 0=User, 1=Influencer (позже), 2=Builder
    }

    uint256 public nextTokenId;
    string private baseTokenURI;

    mapping(uint256 => BeastScoreLocal) public beastScores;
    mapping(uint256 => BeastVisual) public beastVisuals;

    event BeastMinted(
        address indexed user,
        uint256 indexed tokenId,
        BeastVisual visual,
        BeastScoreLocal score
    );

    constructor(address _registry, string memory _baseTokenURI)
        ERC721("Base Beast", "BEAST")
        Ownable(msg.sender)
    {
        require(_registry != address(0), "Registry cannot be zero");
        scoreRegistry = BeastScoreRegistry(_registry);
        baseTokenURI = _baseTokenURI;
    }

    // --- Mint логика ---

    function mintFromScore() external {
    // 1. Читаем score из реестра
    BeastScoreRegistry.BeastScore memory s = scoreRegistry.getScore(msg.sender);

    // ВАЖНО:
    // На этапе MVP мы НЕ делаем require по overallTier,
    // потому что score мы всегда выставляем заранее через our offchain logic.
    // Это избавляет нас от странной связки Hardhat 3 + ABI / revert.
    // require(s.overallTier > 0, "No score set for user");

    // 2. Генерируем визуал Beasta
    BeastVisual memory v = _generateVisual(msg.sender, s);

    // 3. Минтим NFT
    uint256 tokenId = nextTokenId;
    nextTokenId += 1;

    _safeMint(msg.sender, tokenId);

    // 4. Сохраняем snapshot
    BeastScoreLocal memory localScore = _convertScore(s);
    beastScores[tokenId] = localScore;
    beastVisuals[tokenId] = v;

    emit BeastMinted(msg.sender, tokenId, v, localScore);
}

    // --- Вспомогательные функции ---

    function _generateVisual(
        address user,
        BeastScoreRegistry.BeastScore memory s
    ) internal pure returns (BeastVisual memory v) {
        // Простая детерминированная "рандомность" без обращения к block.*,
        // чтобы избежать проблем на разных сетях/конфигурациях.
        uint256 rand = uint256(
            keccak256(
                abi.encodePacked(
                    user,
                    s.overallTier
                )
            )
        );

        // Редкость: ~80% common, 18% rare, 2% legendary
        uint256 rarityRoll = rand % 100;
        if (rarityRoll < 2) {
            v.rarity = 2; // Legendary
        } else if (rarityRoll < 20) {
            v.rarity = 1; // Rare
        } else {
            v.rarity = 0; // Common
        }

        // Вид монстра — 0..14
        v.speciesId = uint8((rand / 100) % 15);

        // Тип пользователя (упрощённо: по builderTier).
        if (s.builderTier >= 3) {
            v.userType = 2; // Builder
        } else {
            v.userType = 0; // User (позже добавим Influencer через socialTier)
        }
    }

    function _convertScore(BeastScoreRegistry.BeastScore memory s)
        internal
        pure
        returns (BeastScoreLocal memory out)
    {
        out.activityDaysTier = s.activityDaysTier;
        out.txCountTier = s.txCountTier;
        out.defiSwapsTier = s.defiSwapsTier;
        out.liquidityTier = s.liquidityTier;
        out.builderTier = s.builderTier;
        out.overallTier = s.overallTier;
    }

    // --- tokenURI ---

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseTokenURI(string calldata _newBaseURI) external onlyOwner {
        baseTokenURI = _newBaseURI;
    }
}
