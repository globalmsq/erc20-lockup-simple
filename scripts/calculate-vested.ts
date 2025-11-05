import { ethers } from 'hardhat';

/**
 * Calculate vested amounts at different time points
 * Usage: LOCKUP_ADDRESS=0x... npx hardhat run scripts/calculate-vested.ts
 */
async function main() {
  const lockupAddress = process.env.LOCKUP_ADDRESS;

  if (!lockupAddress) {
    throw new Error('LOCKUP_ADDRESS environment variable is required');
  }

  const simpleLockup = await ethers.getContractAt('SimpleLockup', lockupAddress);

  // Get beneficiary from contract
  const beneficiaryAddress = await simpleLockup.beneficiary();

  console.log('=== Vesting Timeline Calculator ===');
  console.log('Lockup Contract:', lockupAddress);
  console.log('Beneficiary:', beneficiaryAddress);
  console.log('');

  // Get lockup info
  const lockup = await simpleLockup.lockupInfo();

  if (lockup.totalAmount === 0n) {
    console.log('❌ No lockup found');
    return;
  }

  const startTime = Number(lockup.startTime);
  const cliffDuration = Number(lockup.cliffDuration);
  const vestingDuration = Number(lockup.vestingDuration);
  const totalAmount = lockup.totalAmount;

  console.log('📊 Lockup Parameters:');
  console.log('─'.repeat(70));
  console.log('Total Amount:', ethers.formatEther(totalAmount), 'tokens');
  console.log('Start Time:', new Date(startTime * 1000).toISOString());
  console.log('Cliff Duration:', cliffDuration / 86400, 'days');
  console.log('Vesting Duration:', vestingDuration / 86400, 'days');
  console.log('');

  console.log('📅 Vesting Timeline:');
  console.log('─'.repeat(70));
  console.log('Date'.padEnd(25), 'Elapsed'.padEnd(15), 'Vested %'.padEnd(12), 'Vested Amount');
  console.log('─'.repeat(70));

  // Calculate vesting at different milestones
  const milestones = [
    { label: 'Start', time: startTime },
    { label: 'Cliff End', time: startTime + cliffDuration },
    { label: '25% Duration', time: startTime + vestingDuration * 0.25 },
    { label: '50% Duration', time: startTime + vestingDuration * 0.5 },
    { label: '75% Duration', time: startTime + vestingDuration * 0.75 },
    { label: 'Vesting End', time: startTime + vestingDuration },
  ];

  for (const milestone of milestones) {
    const time = Math.floor(milestone.time);
    let vestedAmount: bigint;

    // Calculate vested amount based on time
    if (time < startTime + cliffDuration) {
      vestedAmount = 0n;
    } else if (time >= startTime + vestingDuration) {
      vestedAmount = totalAmount;
    } else {
      const timeFromStart = time - startTime;
      vestedAmount = (totalAmount * BigInt(timeFromStart)) / BigInt(vestingDuration);
    }

    const vestedPercent = (Number(vestedAmount) / Number(totalAmount)) * 100;
    const elapsedDays = Math.floor((time - startTime) / 86400);
    const dateStr = new Date(time * 1000).toISOString().split('T')[0];

    console.log(
      dateStr.padEnd(25),
      `${elapsedDays}d`.padEnd(15),
      `${vestedPercent.toFixed(1)}%`.padEnd(12),
      ethers.formatEther(vestedAmount)
    );
  }

  console.log('─'.repeat(70));
  console.log('');

  // Monthly breakdown if vesting is longer than 3 months
  if (vestingDuration > 90 * 86400) {
    console.log('📈 Monthly Vesting Breakdown:');
    console.log('─'.repeat(70));
    console.log('Month'.padEnd(10), 'Date'.padEnd(25), 'Vested %'.padEnd(12), 'Vested Amount');
    console.log('─'.repeat(70));

    const monthlyPeriods = Math.min(12, Math.floor(vestingDuration / (30 * 86400)));

    for (let month = 1; month <= monthlyPeriods; month++) {
      const time = startTime + month * 30 * 86400;
      let vestedAmount: bigint;

      if (time < startTime + cliffDuration) {
        vestedAmount = 0n;
      } else if (time >= startTime + vestingDuration) {
        vestedAmount = totalAmount;
      } else {
        const timeFromStart = time - startTime;
        vestedAmount = (totalAmount * BigInt(timeFromStart)) / BigInt(vestingDuration);
      }

      const vestedPercent = (Number(vestedAmount) / Number(totalAmount)) * 100;
      const dateStr = new Date(time * 1000).toISOString().split('T')[0];

      console.log(
        `M${month}`.padEnd(10),
        dateStr.padEnd(25),
        `${vestedPercent.toFixed(1)}%`.padEnd(12),
        ethers.formatEther(vestedAmount)
      );
    }

    console.log('─'.repeat(70));
    console.log('');
  }

  // Current status
  const currentVested = await simpleLockup.vestedAmount();
  const currentReleasable = await simpleLockup.releasableAmount();
  const currentProgress = await simpleLockup.getVestingProgress();

  console.log('📍 Current Status:');
  console.log('─'.repeat(70));
  console.log('Current Time:', new Date().toISOString());
  console.log('Vested Amount:', ethers.formatEther(currentVested), 'tokens');
  console.log('Releasable Amount:', ethers.formatEther(currentReleasable), 'tokens');
  console.log('Vesting Progress:', currentProgress.toString(), '%');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
