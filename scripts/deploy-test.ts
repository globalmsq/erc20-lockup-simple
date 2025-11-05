import { ethers } from 'hardhat';

/**
 * Test deployment script for integration testing
 * Deploys MockERC20 + SimpleLockup with deterministic addresses
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('🧪 Test Deployment Starting...');
  console.log('Deploying contracts with account:', deployer.address);
  console.log(
    'Account balance:',
    ethers.formatEther(await ethers.provider.getBalance(deployer.address))
  );

  // Deploy MockERC20 for testing
  console.log('\n📦 Deploying MockERC20...');
  const MockERC20 = await ethers.getContractFactory('MockERC20');
  const mockToken = await MockERC20.deploy(
    'SUT Token',
    'SUT',
    ethers.parseEther('1000000') // 1M tokens
  );
  await mockToken.waitForDeployment();
  const tokenAddress = await mockToken.getAddress();
  console.log('✅ MockERC20 deployed to:', tokenAddress);

  // Deploy SimpleLockup
  console.log('\n🔒 Deploying SimpleLockup...');
  const SimpleLockup = await ethers.getContractFactory('SimpleLockup');
  const simpleLockup = await SimpleLockup.deploy(tokenAddress);
  await simpleLockup.waitForDeployment();
  const lockupAddress = await simpleLockup.getAddress();
  console.log('✅ SimpleLockup deployed to:', lockupAddress);

  // Post-deployment validation
  console.log('\n🔍 Validating deployment...');
  const verifiedToken = await simpleLockup.token();
  const verifiedOwner = await simpleLockup.owner();

  console.log('Token Address (from contract):', verifiedToken);
  console.log('Owner:', verifiedOwner);

  // Validation checks
  const checks = {
    tokenAddressMatch: verifiedToken.toLowerCase() === tokenAddress.toLowerCase(),
    ownerIsDeployer: verifiedOwner.toLowerCase() === deployer.address.toLowerCase(),
  };

  console.log('\n✓ Validation Results:');
  console.log('  Token address correct:', checks.tokenAddressMatch ? '✅' : '❌');
  console.log('  Owner set correctly:', checks.ownerIsDeployer ? '✅' : '❌');

  if (!checks.tokenAddressMatch || !checks.ownerIsDeployer) {
    throw new Error('Deployment validation failed!');
  }

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: chainId.toString(),
    deployer: deployer.address,
    mockTokenAddress: tokenAddress,
    simpleLockupAddress: lockupAddress,
    owner: verifiedOwner,
    timestamp: new Date().toISOString(),
  };

  console.log('\n=== Test Deployment Summary ===');
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Export contract addresses as environment variables
  console.log('\n=== Environment Variables ===');
  console.log(`export MOCK_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`export SIMPLE_LOCKUP_ADDRESS=${lockupAddress}`);

  console.log('\n✅ Test deployment completed and validated successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
