import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * List lockup status for SimpleLockup contract
 * Note: SimpleLockup only supports one lockup per contract (single beneficiary)
 * This script provides basic contract information including beneficiary
 *
 * Usage: LOCKUP_ADDRESS=0x... npx hardhat run scripts/list-lockups.ts
 */
async function main() {
  const lockupAddress = process.env.LOCKUP_ADDRESS;

  if (!lockupAddress) {
    throw new Error('LOCKUP_ADDRESS environment variable is required');
  }

  console.log('📋 SimpleLockup Contract Information');
  console.log('Contract Address:', lockupAddress);
  console.log('');

  const SimpleLockup = await ethers.getContractFactory('SimpleLockup');
  const simpleLockup = SimpleLockup.attach(lockupAddress);

  // Get contract info
  const tokenAddress = await simpleLockup.token();
  const owner = await simpleLockup.owner();
  const beneficiary = await simpleLockup.beneficiary();

  console.log('═══ Contract Details ═══');
  console.log('Token Address:', tokenAddress);
  console.log('Owner:', owner);
  console.log('Beneficiary:', beneficiary);
  console.log('');

  console.log('ℹ️  Note: SimpleLockup supports one lockup per contract.');
  console.log('ℹ️  To check the lockup details, use:');
  console.log('   LOCKUP_ADDRESS=' + lockupAddress + ' pnpm check-lockup');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
