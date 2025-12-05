# Base Playground – Hardhat + Base Beast

Это мой персональный playground для обучения разработке на **Base** и параллельно — дом для проекта **Base Beast** (ончейн-паспорт активности).

Репозиторий сейчас содержит две большие части:

1. **Base Playground** — учебные смарт-контракты, скрипты и прогресс по Base Learn.
2. **Base Beast** — backend + смарт-контракты для геймифицированного паспорта активности в сети Base.

---

## Part 1 — Base Playground (Hardhat / Solidity)

### Что здесь есть

- Hardhat-проект (TypeScript / ESM).
- Простой контракт `Counter`.
- Дополнительный контракт `BasicMath`.
- Скрипты деплоя и взаимодействия с контрактами на **Base Sepolia**.
- Конфиги TypeScript, Hardhat и игнор `.env`.

### Контракты

- `contracts/Counter.sol`  
  Минимальный счётчик:
  - хранит `count`,
  - умеет инкрементиться,
  - эмитит событие при изменении значения.

- `contracts/BasicMath.sol`  
  Набор чистых функций:
  - `add`,
  - `subtract`,
  - `multiply`,
  - `divide`.

### Скрипты

- `scripts/deploy-counter.mjs`  
  - читает артефакт `Counter`,
  - коннектится к Base Sepolia,
  - деплоит контракт с приватного ключа из `.env`,
  - выводит tx hash и адрес контракта.

- `scripts/interact-counter.mjs`  
  - подключается к уже деплоенному `Counter`,
  - читает текущее значение `count`,
  - вызывает `increment()`,
  - ждёт подтверждения,
  - читает обновлённое значение.

### Конфигурация

- `hardhat.config.ts` — конфиг Hardhat (солидити, сети и т.д.).
- `tsconfig.json` — конфиг TypeScript.
- `.gitignore` — артефакты сборки, `node_modules`, `.env` не попадают в git.

> ⚠️ `.env` в git не коммитится. Приватные ключи всегда держим только локально.

### Пример деплоенного контракта

- **Network:** Base Sepolia  
- **Contract:** `Counter`  
- **Example address:** `0xfF3D6d5A56C4C8c0397D2cd884A3Cdd4eEe14195`  

Смотреть в BaseScan:  
https://sepolia.basescan.org/address/0xfF3D6d5A56C4C8c0397D2cd884A3Cdd4eEe14195

### BasicMath on Base Sepolia

- **Network:** Base Sepolia  
- **Contract:** `BasicMath`  
- **Example address:** `0xFC297da5286eCF22C82Ef79ac01268F97C74a5B0`  

BaseScan:  
https://sepolia.basescan.org/address/0xFC297da5286eCF22C82Ef79ac01268F97C74a5B0

---

### Base Learn Progress

Все 13 модулей Base Learn пройдены с использованием этого репо:

- ✅ Storage  
- ✅ Arrays  
- ✅ Mappings  
- ✅ Structs (`GarageManager.sol`)  
- ✅ Functions / Error Handling (`ErrorTriageExercise.sol`)  
- ✅ Minimal Tokens (`MinimalToken.sol`)  
- ✅ ERC-20 Tokens (`MinimalToken.sol`, `WeightedVoting.sol`)  
- ✅ ERC-721 Tokens (`HaikuNFT.sol`)  
- ✅ ... (остальные модули)

Network: **Base Sepolia**  
Builder wallet (public): `0xfd32507B33220E1Be82E9bb83B4Ea74d4B59Cb25`

---

## Getting started (общие шаги)

### 1. Клонирование репозитория

```bash
git clone https://github.com/KaanBagnyuk/base-playground.git
cd base-playground
