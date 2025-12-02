// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

library SillyStringUtils {
    struct Haiku {
        string line1;
        string line2;
        string line3;
    }

    function shruggie(string memory _input) internal pure returns (string memory) {
        // ВАЖНО: пробел + эмодзи 🤷
        return string.concat(_input, unicode" 🤷");
    }
}


