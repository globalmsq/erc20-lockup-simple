import { ethers } from 'hardhat';
import * as readline from 'readline';

/**
 * Interactive helper for creating token lockups
 * Usage: LOCKUP_ADDRESS=0x... npx hardhat run scripts/create-lockup-helper.ts
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

  console.log('=== Interactive Lockup Creation ===');
  console.log('Lockup Contract:', lockupAddress);
  console.log('');

  const [deployer] = await ethers.getSigners();
  console.log('Your Address:', deployer.address);
  console.log(
    'Your Balance:',
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    'MATIC'
  );
  console.log('');

  // Get contract instances
  const simpleLockup = await ethers.getContractAt('SimpleLockup', lockupAddress);
  const tokenAddress = await simpleLockup.token();
  const token = await ethers.getContractAt('IERC20', tokenAddress);

  console.log('Token Address:', tokenAddress);
  const tokenBalance = await token.balanceOf(deployer.address);
  console.log('Your Token Balance:', ethers.formatEther(tokenBalance), 'tokens');
  console.log('');

  // Gather lockup parameters
  console.log('📝 Enter Lockup Parameters:');
  console.log('─'.repeat(50));

  const beneficiary = await question('Beneficiary Address: ');
  if (!ethers.isAddress(beneficiary)) {
    rl.close();
    throw new Error('Invalid beneficiary address');
  }

  // Check if lockup already exists
  const existingLockup = await simpleLockup.lockups(beneficiary);
  if (existingLockup.totalAmount > 0n) {
    rl.close();
    throw new Error('Lockup already exists for this beneficiary');
  }

  const amountStr = await question('Total Amount (in tokens): ');
  const amount = ethers.parseEther(amountStr);

  if (amount <= 0n) {
    rl.close();
    throw new Error('Amount must be greater than 0');
  }

  if (amount > tokenBalance) {
    rl.close();
    throw new Error(
      `Insufficient balance. You have ${ethers.formatEther(tokenBalance)} tokens, but need ${amountStr} tokens`
    );
  }

  const cliffInput = await question('Cliff Duration (in seconds): ');
  const cliffDuration = parseInt(cliffInput);

  const vestingInput = await question('Total Vesting Duration (in seconds): ');
  const vestingDuration = parseInt(vestingInput);

  if (vestingDuration <= 0) {
    rl.close();
    throw new Error('Vesting duration must be greater than 0');
  }

  if (cliffDuration > vestingDuration) {
    rl.close();
    throw new Error('Cliff duration cannot be longer than vesting duration');
  }

  const revocableStr = await question('Revocable? (yes/no): ');
  const revocable = revocableStr.toLowerCase() === 'yes' || revocableStr.toLowerCase() === 'y';

  console.log('');
  console.log('📊 Lockup Summary:');
  console.log('─'.repeat(50));
  console.log('Beneficiary:', beneficiary);
  console.log('Amount:', ethers.formatEther(amount), 'tokens');
  console.log('Cliff Duration:', cliffDuration / 86400, 'days');
  console.log('Vesting Duration:', vestingDuration / 86400, 'days');
  console.log('Revocable:', revocable);
  console.log('─'.repeat(50));
  console.log('');

  const confirm = await question('Proceed with lockup creation? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('❌ Lockup creation cancelled');
    rl.close();
    return;
  }

  // Check allowance
  const currentAllowance = await token.allowance(deployer.address, lockupAddress);

  if (currentAllowance < amount) {
    console.log('');
    console.log('⚠️  Insufficient allowance. Approving tokens...');
    const approveTx = await token.approve(lockupAddress, amount);
    console.log('Approval transaction:', approveTx.hash);
    await approveTx.wait();
    console.log('✅ Tokens approved');
  }

  // Create lockup
  console.log('');
  console.log('🔨 Creating lockup...');
  const tx = await simpleLockup.createLockup(
    beneficiary,
    amount,
    cliffDuration,
    vestingDuration,
    revocable
  );

  console.log('Transaction:', tx.hash);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log('✅ Lockup created successfully!');
  console.log('Gas used:', receipt?.gasUsed.toString());
  console.log('');

  rl.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    rl.close();
    process.exit(1);
  });
