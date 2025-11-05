import { ethers } from 'hardhat';
import * as readline from 'readline';

/**
 * Interactive helper for releasing vested tokens
 * Usage: LOCKUP_ADDRESS=0x... npx hardhat run scripts/release-helper.ts
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  const lockupAddress = process.env.LOCKUP_ADDRESS;

  if (!lockupAddress) {
    throw new Error('LOCKUP_ADDRESS environment variable is required');
  }

  console.log('=== Interactive Token Release ===');
  console.log('SimpleLockup Address:', lockupAddress);
  console.log('');

  const [beneficiary] = await ethers.getSigners();
  console.log('Your Address:', beneficiary.address);
  console.log('');

  // Get contract instance
  const simpleLockup = await ethers.getContractAt('SimpleLockup', lockupAddress);

  // Get lockup info
  const lockup = await simpleLockup.lockupInfo();

  if (lockup.totalAmount === 0n) {
    console.log('❌ No lockup found for your address');
    rl.close();
    return;
  }

  // Get vesting info
  const vestedAmount = await simpleLockup.vestedAmount();
  const releasableAmount = await simpleLockup.releasableAmount();
  const vestingProgress = await simpleLockup.getVestingProgress();
  const remainingTime = await simpleLockup.getRemainingVestingTime();

  console.log('📊 Your Lockup Information:');
  console.log('─'.repeat(50));
  console.log('Total Amount:', ethers.formatEther(lockup.totalAmount), 'tokens');
  console.log('Released Amount:', ethers.formatEther(lockup.releasedAmount), 'tokens');
  console.log('Vested Amount:', ethers.formatEther(vestedAmount), 'tokens');
  console.log('Releasable Amount:', ethers.formatEther(releasableAmount), 'tokens');
  console.log('Vesting Progress:', vestingProgress.toString(), '%');
  console.log('Remaining Time:', Number(remainingTime) / 86400, 'days');
  console.log('─'.repeat(50));
  console.log('');

  // Check cliff period
  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const cliffEnd = lockup.startTime + lockup.cliffDuration;

  if (currentTime < cliffEnd) {
    const remainingCliffDays = Number(cliffEnd - currentTime) / 86400;
    console.log('⏳ Still in cliff period');
    console.log(`   Cliff ends in ${remainingCliffDays.toFixed(1)} days`);
    console.log('   No tokens available for release yet');
    rl.close();
    return;
  }

  if (releasableAmount === 0n) {
    console.log('⚠️  No tokens available for release at this time');
    rl.close();
    return;
  }

  console.log(`💰 You can release ${ethers.formatEther(releasableAmount)} tokens now!`);
  console.log('');

  // Estimate gas
  try {
    const estimatedGas = await simpleLockup.release.estimateGas();
    console.log('Estimated Gas:', estimatedGas.toString());
  } catch (error: unknown) {
    console.log('⚠️  Gas estimation failed:');
    if (error instanceof Error) {
      console.log(error.message);
    }
  }

  console.log('');
  const confirm = await question('Proceed with token release? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('❌ Token release cancelled');
    rl.close();
    return;
  }

  // Release tokens
  console.log('');
  console.log('🔓 Releasing tokens...');
  const tx = await simpleLockup.release();

  console.log('Transaction:', tx.hash);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log('✅ Tokens released successfully!');
  console.log('Gas used:', receipt?.gasUsed.toString());
  console.log('');

  // Get updated lockup info
  const updatedLockup = await simpleLockup.lockupInfo();
  console.log('📊 Updated Lockup Status:');
  console.log('─'.repeat(50));
  console.log('Total Released:', ethers.formatEther(updatedLockup.releasedAmount), 'tokens');
  console.log(
    'Remaining Locked:',
    ethers.formatEther(updatedLockup.totalAmount - updatedLockup.releasedAmount),
    'tokens'
  );
  console.log('─'.repeat(50));

  rl.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    rl.close();
    process.exit(1);
  });
