// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BeastScoreRegistry {
    struct BeastScore {
        uint8 activityDaysTier; // 0–5
        uint8 txCountTier;      // 0–5
        uint8 defiSwapsTier;    // 0–5
        uint8 liquidityTier;    // 0–5
        uint8 builderTier;      // 0–5
        uint8 nftMintsTier;     // 0–5
        uint8 socialTier;       // 0–5
        uint8 gasSpentTier;     // 0–5
        uint8 defiVolumeTier;   // 0–5
        uint8 overallTier;      // 0–5
    }

    mapping(address => BeastScore) public walletScores;
    address public scoreOracle;

    event ScoreOracleChanged(address indexed oldOracle, address indexed newOracle);
    event ScoreUpdated(address indexed user, BeastScore score);

    constructor(address _scoreOracle) {
        require(_scoreOracle != address(0), "Oracle cannot be zero");
        scoreOracle = _scoreOracle;
        emit ScoreOracleChanged(address(0), _scoreOracle);
    }

    modifier onlyScoreOracle() {
        require(msg.sender == scoreOracle, "Not score oracle");
        _;
    }

    function setScoreOracle(address _newOracle) external onlyScoreOracle {
        require(_newOracle != address(0), "Oracle cannot be zero");
        address old = scoreOracle;
        scoreOracle = _newOracle;
        emit ScoreOracleChanged(old, _newOracle);
    }

    function setScore(address user, BeastScore calldata score) external onlyScoreOracle {
        require(user != address(0), "User cannot be zero");
        walletScores[user] = score;
        emit ScoreUpdated(user, score);
    }

    function getScore(address user) external view returns (BeastScore memory) {
        return walletScores[user];
    }
}
