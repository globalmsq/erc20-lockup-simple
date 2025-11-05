import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Check lockup information
 * Usage: LOCKUP_ADDRESS=0x... npx hardhat run scripts/check-lockup.ts
 */
async function main() {
  const lockupAddress = process.env.LOCKUP_ADDRESS;

  if (!lockupAddress) {
    throw new Error('LOCKUP_ADDRESS environment variable is required');
  }

  console.log('🔍 Checking Lockup Information');
  console.log('SimpleLockup Address:', lockupAddress);
  console.log('');

  const SimpleLockup = await ethers.getContractFactory('SimpleLockup');
  const simpleLockup = SimpleLockup.attach(lockupAddress);

  // Get beneficiary from contract
  const beneficiaryAddress = await simpleLockup.beneficiary();

  console.log('Beneficiary Address:', beneficiaryAddress);
  console.log('');

  // Get lockup info
  const lockup = await simpleLockup.lockupInfo();

  if (lockup.totalAmount === 0n) {
    console.log('❌ No lockup found');
    return;
  }

  // Get additional info
  const vestedAmount = await simpleLockup.vestedAmount();
  const releasableAmount = await simpleLockup.releasableAmount();
  const vestingProgress = await simpleLockup.getVestingProgress();
  const remainingTime = await simpleLockup.getRemainingVestingTime();

  // Calculate timestamps
  const cliffEnd = lockup.startTime + lockup.cliffDuration;
  const vestingEnd = lockup.startTime + lockup.vestingDuration;
  const currentTime = BigInt(Math.floor(Date.now() / 1000));

  console.log('═══ Lockup Details ═══');
  console.log('Total Amount:', ethers.formatEther(lockup.totalAmount), 'tokens');
  console.log('Released Amount:', ethers.formatEther(lockup.releasedAmount), 'tokens');
  console.log('Vested Amount:', ethers.formatEther(vestedAmount), 'tokens');
  console.log('Releasable Amount:', ethers.formatEther(releasableAmount), 'tokens');
  console.log('');

  console.log('═══ Vesting Schedule ═══');
  console.log('Start Time:', new Date(Number(lockup.startTime) * 1000).toISOString());
  console.log('Cliff End:', new Date(Number(cliffEnd) * 1000).toISOString());
  console.log('Vesting End:', new Date(Number(vestingEnd) * 1000).toISOString());
  console.log('Cliff Duration:', Number(lockup.cliffDuration) / 86400, 'days');
  console.log('Total Vesting Duration:', Number(lockup.vestingDuration) / 86400, 'days');
  console.log('');

  console.log('═══ Current Status ═══');
  console.log('Vesting Progress:', vestingProgress.toString(), '%');
  console.log('Remaining Time:', Number(remainingTime) / 86400, 'days');
  console.log('Revocable:', lockup.revocable);
  console.log('Revoked:', lockup.revoked);

  if (lockup.revoked) {
    console.log('Vested at Revoke:', ethers.formatEther(lockup.vestedAtRevoke), 'tokens');
  }

  console.log('');

  // Status indicators
  if (currentTime < cliffEnd) {
    console.log('⏳ Status: In cliff period (no tokens vested yet)');
  } else if (currentTime < vestingEnd) {
    console.log('🔄 Status: Vesting in progress');
  } else {
    console.log('✅ Status: Fully vested');
  }

  if (releasableAmount > 0n) {
    console.log('💰 You can release', ethers.formatEther(releasableAmount), 'tokens now!');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
