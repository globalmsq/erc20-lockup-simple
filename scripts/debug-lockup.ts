import { ethers } from 'hardhat';

/**
 * Debug helper for troubleshooting lockup creation issues
 * Usage: LOCKUP_ADDRESS=0x... BENEFICIARY_ADDRESS=0x... npx hardhat run scripts/debug-lockup.ts
 */
async function main() {
  const lockupAddress = process.env.LOCKUP_ADDRESS;
  const beneficiaryAddress = process.env.BENEFICIARY_ADDRESS;

  if (!lockupAddress) {
    throw new Error('LOCKUP_ADDRESS environment variable is required');
  }

  if (!beneficiaryAddress) {
    throw new Error('BENEFICIARY_ADDRESS environment variable is required');
  }

  console.log('🔍 Debugging Lockup Creation');
  console.log('SimpleLockup Address:', lockupAddress);
  console.log('Beneficiary Address:', beneficiaryAddress);
  console.log('');

  const [deployer] = await ethers.getSigners();

  // Get contract instances
  const simpleLockup = await ethers.getContractAt('SimpleLockup', lockupAddress);
  const tokenAddress = await simpleLockup.token();
  const token = await ethers.getContractAt('IERC20', tokenAddress);

  console.log('=== Contract Information ===');
  console.log('Token Address:', tokenAddress);
  const owner = await simpleLockup.owner();
  console.log('Owner:', owner);
  console.log('Deployer:', deployer.address);
  console.log('Is Owner?:', owner.toLowerCase() === deployer.address.toLowerCase());
  console.log('');

  console.log('=== Token Balances ===');
  const deployerBalance = await token.balanceOf(deployer.address);
  console.log('Deployer Token Balance:', ethers.formatEther(deployerBalance), 'tokens');

  const contractBalance = await token.balanceOf(lockupAddress);
  console.log('Contract Token Balance:', ethers.formatEther(contractBalance), 'tokens');
  console.log('');

  console.log('=== Allowance ===');
  const allowance = await token.allowance(deployer.address, lockupAddress);
  console.log('Current Allowance:', ethers.formatEther(allowance), 'tokens');
  console.log('');

  console.log('=== Existing Lockup Check ===');
  const existingLockup = await simpleLockup.lockups(beneficiaryAddress);
  console.log('Total Amount:', ethers.formatEther(existingLockup.totalAmount));
  console.log('Released Amount:', ethers.formatEther(existingLockup.releasedAmount));
  console.log('Lockup Exists?:', existingLockup.totalAmount > 0n);
  console.log('');

  // Dry run test
  const testAmount = ethers.parseEther('1000');
  const testCliff = 30 * 24 * 60 * 60; // 30 days
  const testVesting = 365 * 24 * 60 * 60; // 1 year

  if (existingLockup.totalAmount === 0n && deployerBalance >= testAmount) {
    console.log('=== Dry Run (estimateGas) ===');
    try {
      const estimatedGas = await simpleLockup.createLockup.estimateGas(
        beneficiaryAddress,
        testAmount,
        testCliff,
        testVesting,
        true
      );
      console.log('✅ Gas Estimate:', estimatedGas.toString());
      console.log('✅ No errors detected in dry run');
    } catch (error: unknown) {
      console.log('❌ Dry run failed:');
      if (error instanceof Error) {
        console.log(error.message);
      } else {
        console.log(String(error));
      }

      // Try to decode the error
      console.log('');
      console.log('=== Error Analysis ===');
      if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log('❌ You are not the owner. Only owner can create lockups.');
      }
      if (allowance < testAmount) {
        console.log('❌ Insufficient allowance. Need to approve tokens first.');
      }
      if (deployerBalance < testAmount) {
        console.log('❌ Insufficient token balance.');
      }
    }
  } else if (existingLockup.totalAmount > 0n) {
    console.log('⚠️  Lockup already exists for this beneficiary');
    console.log('Cannot create another lockup for the same address');
  } else {
    console.log('⚠️  Insufficient balance for dry run test');
  }

  console.log('');
  console.log('=== Recommendations ===');
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log('1. Switch to the owner account');
  }
  if (allowance === 0n) {
    console.log('2. Approve tokens: token.approve(lockupAddress, amount)');
  }
  if (deployerBalance === 0n) {
    console.log('3. Get tokens first');
  }
  if (existingLockup.totalAmount > 0n) {
    console.log('4. Use a different beneficiary address (lockup already exists)');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
