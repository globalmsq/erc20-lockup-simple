import { ethers } from 'hardhat';
import * as readline from 'readline';

/**
 * Interactive helper for revoking lockups (owner only)
 * Usage: LOCKUP_ADDRESS=0x... npx hardhat run scripts/revoke-helper.ts
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

  console.log('=== Interactive Lockup Revocation ===');
  console.log('SimpleLockup Address:', lockupAddress);
  console.log('');

  const [owner] = await ethers.getSigners();
  console.log('Your Address:', owner.address);
  console.log('');

  // Get contract instance
  const simpleLockup = await ethers.getContractAt('SimpleLockup', lockupAddress);

  // Verify ownership
  const contractOwner = await simpleLockup.owner();
  if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) {
    console.log('❌ You are not the owner of this contract');
    console.log('Contract Owner:', contractOwner);
    rl.close();
    return;
  }

  // Get beneficiary from contract
  const beneficiary = await simpleLockup.beneficiary();
  console.log('Beneficiary:', beneficiary);
  console.log('');

  // Get lockup info
  const lockup = await simpleLockup.lockupInfo();

  if (lockup.totalAmount === 0n) {
    console.log('❌ No lockup found');
    rl.close();
    return;
  }

  if (lockup.revoked) {
    console.log('❌ Lockup already revoked');
    rl.close();
    return;
  }

  if (!lockup.revocable) {
    console.log('❌ This lockup is not revocable');
    rl.close();
    return;
  }

  // Calculate vesting info
  const vestedAmount = await simpleLockup.vestedAmount();
  const unvestedAmount = lockup.totalAmount - vestedAmount;

  console.log('📊 Lockup Information:');
  console.log('─'.repeat(50));
  console.log('Beneficiary:', beneficiary);
  console.log('Total Amount:', ethers.formatEther(lockup.totalAmount), 'tokens');
  console.log('Released Amount:', ethers.formatEther(lockup.releasedAmount), 'tokens');
  console.log('Vested Amount:', ethers.formatEther(vestedAmount), 'tokens');
  console.log('Unvested Amount:', ethers.formatEther(unvestedAmount), 'tokens');
  console.log('─'.repeat(50));
  console.log('');

  console.log('⚠️  Revocation Impact:');
  console.log('─'.repeat(50));
  console.log('✅ Beneficiary keeps:', ethers.formatEther(vestedAmount), 'tokens (vested)');
  console.log('📤 Returns to owner:', ethers.formatEther(unvestedAmount), 'tokens (unvested)');
  console.log('─'.repeat(50));
  console.log('');

  console.log('⚠️  WARNING: This action cannot be undone!');
  console.log('');

  const confirm1 = await question(`Type the beneficiary address to confirm: `);

  if (confirm1.toLowerCase() !== beneficiary.toLowerCase()) {
    console.log('❌ Address mismatch. Revocation cancelled.');
    rl.close();
    return;
  }

  const confirm2 = await question('Type "REVOKE" to proceed: ');

  if (confirm2 !== 'REVOKE') {
    console.log('❌ Revocation cancelled');
    rl.close();
    return;
  }

  // Revoke lockup
  console.log('');
  console.log('🔨 Revoking lockup...');
  const tx = await simpleLockup.revoke();

  console.log('Transaction:', tx.hash);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log('✅ Lockup revoked successfully!');
  console.log('Gas used:', receipt?.gasUsed.toString());
  console.log('');

  // Get updated lockup info
  const updatedLockup = await simpleLockup.lockupInfo();
  console.log('📊 Revoked Lockup Status:');
  console.log('─'.repeat(50));
  console.log('Revoked:', updatedLockup.revoked);
  console.log('Vested at Revoke:', ethers.formatEther(updatedLockup.vestedAtRevoke), 'tokens');
  console.log(
    'Beneficiary can still claim:',
    ethers.formatEther(updatedLockup.vestedAtRevoke - updatedLockup.releasedAmount),
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
