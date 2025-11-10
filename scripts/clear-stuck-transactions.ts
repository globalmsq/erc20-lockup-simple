import { ethers } from 'hardhat';

async function main() {
  console.log('🔧 Clearing Stuck Transactions\n');

  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();

  console.log('📍 Address:', address);

  // Get current nonce state
  const latestNonce = await ethers.provider.getTransactionCount(address, 'latest');
  const pendingNonce = await ethers.provider.getTransactionCount(address, 'pending');

  console.log('📊 Latest Nonce:', latestNonce);
  console.log('⏳ Pending Nonce:', pendingNonce);
  console.log('🚨 Stuck Transactions:', pendingNonce - latestNonce);
  console.log('');

  if (latestNonce === pendingNonce) {
    console.log('✅ No stuck transactions found!');
    return;
  }

  // Get current gas price and increase by 200% (3x) to ensure replacement
  const feeData = await ethers.provider.getFeeData();
  const maxFeePerGas = (feeData.maxFeePerGas! * BigInt(300)) / BigInt(100);
  const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas! * BigInt(300)) / BigInt(100);

  console.log('⛽ Gas Settings:');
  console.log('  Max Fee Per Gas:', ethers.formatUnits(maxFeePerGas, 'gwei'), 'gwei');
  console.log('  Max Priority Fee:', ethers.formatUnits(maxPriorityFeePerGas, 'gwei'), 'gwei');
  console.log('');

  // Replace transactions starting from latestNonce
  console.log('🔄 Replacing stuck transactions...\n');

  for (let nonce = latestNonce; nonce < pendingNonce; nonce++) {
    console.log(`Processing nonce ${nonce}...`);

    try {
      // Send 0 ETH to self with higher gas price
      const tx = await signer.sendTransaction({
        to: address,
        value: 0,
        nonce: nonce,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        gasLimit: 21000, // Basic transfer gas limit
      });

      console.log(`  ✅ Replacement tx sent: ${tx.hash}`);
      console.log(`  ⏳ Waiting for confirmation...`);

      const receipt = await tx.wait(1);
      console.log(`  ✅ Confirmed in block ${receipt?.blockNumber}`);
      console.log('');
    } catch (error: any) {
      console.log(`  ⚠️  Error replacing nonce ${nonce}:`, error.message);

      // If we get "nonce too low", it means this nonce was already processed
      if (error.message.includes('nonce too low')) {
        console.log(`  ℹ️  Nonce ${nonce} already processed, continuing...\n`);
        continue;
      }

      // If we get "replacement transaction underpriced", increase gas more
      if (error.message.includes('replacement') || error.message.includes('underpriced')) {
        console.log(`  ℹ️  Need higher gas price, retrying with 200% increase (5x total)...\n`);

        const higherMaxFee = (maxFeePerGas * BigInt(200)) / BigInt(100);
        const higherPriorityFee = (maxPriorityFeePerGas * BigInt(200)) / BigInt(100);

        try {
          const retryTx = await signer.sendTransaction({
            to: address,
            value: 0,
            nonce: nonce,
            maxFeePerGas: higherMaxFee,
            maxPriorityFeePerGas: higherPriorityFee,
            gasLimit: 21000,
          });

          console.log(`  ✅ Retry tx sent: ${retryTx.hash}`);
          console.log(`  ⏳ Waiting for confirmation...`);

          const retryReceipt = await retryTx.wait(1);
          console.log(`  ✅ Confirmed in block ${retryReceipt?.blockNumber}`);
          console.log('');
        } catch (retryError: any) {
          console.log(`  ❌ Retry failed:`, retryError.message);
          console.log(`  ⚠️  Manual intervention may be needed for nonce ${nonce}\n`);
        }
      }
    }

    // Small delay to avoid overwhelming the RPC
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Check final state
  console.log('\n📊 Final Check:');
  const finalLatestNonce = await ethers.provider.getTransactionCount(address, 'latest');
  const finalPendingNonce = await ethers.provider.getTransactionCount(address, 'pending');

  console.log('Latest Nonce:', finalLatestNonce);
  console.log('Pending Nonce:', finalPendingNonce);

  if (finalLatestNonce === finalPendingNonce) {
    console.log('\n✅ All stuck transactions cleared!');
  } else {
    console.log(
      `\n⚠️  Still ${finalPendingNonce - finalLatestNonce} stuck transactions remaining`
    );
    console.log('You may need to run this script again or manually clear them.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
