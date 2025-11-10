import { ethers } from 'hardhat';

async function main() {
  console.log('🚫 Cancelling All Pending Transactions\n');

  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();

  console.log('📍 Address:', address);

  // Get current nonce state
  const latestNonce = await ethers.provider.getTransactionCount(address, 'latest');
  const pendingNonce = await ethers.provider.getTransactionCount(address, 'pending');

  console.log('📊 Latest Nonce:', latestNonce);
  console.log('⏳ Pending Nonce:', pendingNonce);
  console.log('🚨 Transactions to Cancel:', pendingNonce - latestNonce);
  console.log('');

  if (latestNonce === pendingNonce) {
    console.log('✅ No pending transactions to cancel!');
    return;
  }

  // Get very high gas price to ensure immediate replacement (5x current)
  const feeData = await ethers.provider.getFeeData();
  const maxFeePerGas = (feeData.maxFeePerGas! * BigInt(500)) / BigInt(100);
  const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas! * BigInt(500)) / BigInt(100);

  console.log('⛽ Gas Settings (5x current price):');
  console.log('  Max Fee Per Gas:', ethers.formatUnits(maxFeePerGas, 'gwei'), 'gwei');
  console.log('  Max Priority Fee:', ethers.formatUnits(maxPriorityFeePerGas, 'gwei'), 'gwei');
  console.log('');

  console.log('🔄 Cancelling transactions (sending 0 ETH to self)...\n');

  let successCount = 0;
  let failCount = 0;

  for (let nonce = latestNonce; nonce < pendingNonce; nonce++) {
    console.log(`Cancelling nonce ${nonce}...`);

    try {
      // Send 0 ETH to self with very high gas price
      const tx = await signer.sendTransaction({
        to: address,
        value: 0,
        nonce: nonce,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        gasLimit: 21000,
      });

      console.log(`  ✅ Cancellation tx sent: ${tx.hash}`);

      // Don't wait for confirmation, move to next immediately
      successCount++;
      console.log('');

    } catch (error: any) {
      if (error.message.includes('nonce too low')) {
        console.log(`  ℹ️  Nonce ${nonce} already processed\n`);
        successCount++;
        continue;
      }

      console.log(`  ❌ Failed:`, error.message.substring(0, 100));
      failCount++;
      console.log('');
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Successfully sent: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log('');
  console.log('⏳ Waiting 10 seconds for transactions to be mined...');

  await new Promise((resolve) => setTimeout(resolve, 10000));

  // Check final state
  const finalLatestNonce = await ethers.provider.getTransactionCount(address, 'latest');
  const finalPendingNonce = await ethers.provider.getTransactionCount(address, 'pending');

  console.log('\n📊 Final Status:');
  console.log('  Latest Nonce:', finalLatestNonce);
  console.log('  Pending Nonce:', finalPendingNonce);
  console.log('  Remaining stuck:', finalPendingNonce - finalLatestNonce);

  if (finalLatestNonce === finalPendingNonce) {
    console.log('\n✅ All transactions cleared successfully!');
  } else {
    console.log(`\n⚠️  Still ${finalPendingNonce - finalLatestNonce} pending transactions`);
    console.log('They should clear soon. Check again in 1-2 minutes.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
