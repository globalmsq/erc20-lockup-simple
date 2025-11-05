import { expect } from 'chai';
import { ethers } from 'hardhat';
import { MockERC20 } from '../../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

/**
 * Integration Test: Deployment Validation
 * Tests constructor token address validation
 */
describe('Integration: Deployment Validation', function () {
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let validToken: MockERC20;
  let initialSnapshot: string;

  before(async function () {
    initialSnapshot = await ethers.provider.send('evm_snapshot', []);
  });

  beforeEach(async function () {
    await ethers.provider.send('evm_revert', [initialSnapshot]);
    initialSnapshot = await ethers.provider.send('evm_snapshot', []);

    [owner, user] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory('MockERC20');
    validToken = await MockERC20Factory.deploy('Test Token', 'TEST', ethers.parseEther('1000000'));
    await validToken.waitForDeployment();
  });

  describe('Token Address Validation', function () {
    it('Should reject zero address during deployment', async function () {
      console.log('📋 Test: Zero address rejection');

      const SimpleLockupFactory = await ethers.getContractFactory('SimpleLockup');

      await expect(SimpleLockupFactory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        SimpleLockupFactory,
        'InvalidTokenAddress'
      );

      console.log('  ✅ Zero address correctly rejected');
    });

    it('Should reject EOA address during deployment', async function () {
      console.log('📋 Test: EOA (non-contract) address rejection');

      const SimpleLockupFactory = await ethers.getContractFactory('SimpleLockup');

      await expect(SimpleLockupFactory.deploy(user.address)).to.be.revertedWithCustomError(
        SimpleLockupFactory,
        'InvalidTokenAddress'
      );

      console.log('  ✅ EOA address correctly rejected (no code at address)');
    });

    it('Should accept any contract address during deployment', async function () {
      console.log('📋 Test: Contract address acceptance');
      console.log('  ⚠️  Note: Deployer must verify ERC20 compatibility manually');

      const SimpleLockupFactory = await ethers.getContractFactory('SimpleLockup');

      const simpleLockup = await SimpleLockupFactory.deploy(await validToken.getAddress());
      await simpleLockup.waitForDeployment();

      expect(await simpleLockup.token()).to.equal(await validToken.getAddress());
      expect(await simpleLockup.owner()).to.equal(owner.address);

      console.log('  ✅ Contract address accepted');
      console.log('  Token:', await validToken.getAddress());
      console.log('  Owner:', owner.address);
    });
  });
});
