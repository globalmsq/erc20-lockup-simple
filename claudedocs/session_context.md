# SimpleLockup Project - Session Context

**Session Loaded**: 2025-11-10
**Project**: ERC20 Lockup Simple
**Status**: ✅ Context loaded and validated

## Project Overview

**SimpleLockup** - Minimal token vesting contract with linear vesting on Polygon.

### Key Characteristics
- **Type**: Hardhat-based Solidity smart contract project
- **Purpose**: ERC20 token lockup with linear vesting (one lockup per contract)
- **Network**: Polygon (mainnet) & Amoy (testnet)
- **Dependencies**: OpenZeppelin contracts v5.0.0, Hardhat v2.19.0, TypeScript

### Architecture
```
SimpleLockup Contract
├── LockupInfo (single beneficiary design)
├── Immutable token address (set at deployment)
├── Linear vesting with cliff support
├── Revocable lockups
└── 7 core functions
```

## Project Structure

### Smart Contracts
- `contracts/SimpleLockup.sol` - Main vesting contract (422 lines)
- `contracts/MockERC20.sol` - Test token for development

### Test Suite
- `test/SimpleLockup.test.ts` - Unit tests
- `test/integration/*.test.ts` - 6 integration test suites
  - Deployment validation
  - Full lifecycle
  - Periodic release
  - Revocation scenarios
  - Edge cases
  - Security tests

### Utility Scripts (9 scripts)
- `deploy.ts` / `deploy-test.ts` - Production & test deployments
- `create-lockup-helper.ts` - Interactive lockup creation
- `release-helper.ts` - Beneficiary token release
- `revoke-helper.ts` - Owner lockup revocation
- `check-lockup.ts` - Status queries
- `calculate-vested.ts` - Timeline calculations
- `list-lockups.ts` - Contract info
- `debug-lockup.ts` - Troubleshooting

## Technical Details

### Solidity Version
- v0.8.24

### Key Features
- ✅ One lockup per contract (single beneficiary)
- ✅ Linear vesting with cliff period
- ✅ Revocable lockups (owner can revoke unvested tokens)
- ✅ Immutable token address
- ✅ ReentrancyGuard protection
- ✅ Deflationary token detection
- ✅ No pause mechanism (reduced attack surface)

### Security Considerations
- Compatible: Standard ERC-20 tokens only
- Incompatible: ERC-777, deflationary, rebasing tokens
- Auto-validation: Balance checks during lockup creation
- Front-running protection: Private transactions recommended for sensitive revocations

## Recent Activity

### Last 5 Commits
1. `d8bbdda` - docs: add network parameter to all pnpm command examples
2. `15f636d` - feat: add comprehensive token validation to deployment script
3. `24e28c4` - refactor: rebrand from SUT-specific to generic ERC20 lockup contract
4. `9199ab4` - docs: remove all export PRIVATE_KEY commands from README
5. `88d4889` - docs: improve environment variable configuration guide

### Branch Status
- **Current**: main
- **Clean**: No uncommitted changes
- **Remote**: origin/main (synced)

## Environment & Configuration

### Required Environment Variables
- `PRIVATE_KEY` - Deployer's private key
- `TOKEN_ADDRESS` - ERC20 token address for lockup
- `LOCKUP_ADDRESS` - Deployed contract address (set after deployment)

### Networks
- **Polygon Mainnet**: Production deployment
- **Amoy Testnet**: Testing and validation
- **Localhost**: Development with MockERC20

### Available Commands
```bash
pnpm build                  # Compile contracts
pnpm test                   # Run unit tests
pnpm test:coverage          # Coverage report
pnpm integration-tests      # Full Docker test suite
pnpm deploy:mainnet         # Deploy to Polygon
pnpm deploy:testnet         # Deploy to Amoy
pnpm create-lockup          # Interactive lockup creation
pnpm release-helper         # Claim vested tokens
pnpm revoke-helper          # Revoke lockup (owner)
```

## Session Ready

✅ **Context loaded successfully**
✅ **Project structure understood**
✅ **Git status verified (clean)**
✅ **Dependencies analyzed**
✅ **Ready for development tasks**

---

*Context validation complete - session initialized and ready for work.*
