import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { SimpleLockup, MockERC20 } from '../../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

/**
 * Integration Test: Edge Cases
 * Tests boundary conditions and edge cases
 */
describe('Integration: Edge Cases', function () {
  let simpleLockup: SimpleLockup;
  let token: MockERC20;
  let _owner: SignerWithAddress;
  let beneficiary: SignerWithAddress;
  let initialSnapshot: string;

  const MONTH = 30 * 24 * 60 * 60; // 30 days
  const TOTAL_AMOUNT = ethers.parseEther('1000');

  before(async function () {
    initialSnapshot = await ethers.provider.send('evm_snapshot', []);
  });

  beforeEach(async function () {
    await ethers.provider.send('evm_revert', [initialSnapshot]);
    initialSnapshot = await ethers.provider.send('evm_snapshot', []);

    [_owner, beneficiary] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory('MockERC20');
    token = await MockERC20Factory.deploy('SUT Token', 'SUT', ethers.parseEther('1000000'));
    await token.waitForDeployment();

    const SimpleLockupFactory = await ethers.getContractFactory('SimpleLockup');
    simpleLockup = await SimpleLockupFactory.deploy(await token.getAddress());
    await simpleLockup.waitForDeployment();

    await token.approve(await simpleLockup.getAddress(), TOTAL_AMOUNT * 10n);
  });

  it('Should handle cliff period correctly', async function () {
    const cliffDuration = 6 * MONTH; // 6 months cliff
    const vestingDuration = 12 * MONTH; // 12 months total

    await simpleLockup.createLockup(
      beneficiary.address,
      TOTAL_AMOUNT,
      cliffDuration,
      vestingDuration,
      true
    );

    console.log('✅ Lockup with cliff created');

    // During cliff period - no vesting
    await time.increase(3 * MONTH);
    expect(await simpleLockup.vestedAmount()).to.equal(0);
    console.log('  ✅ No vesting during cliff period');

    // After cliff - vesting starts
    await time.increase(4 * MONTH); // Total 7 months (past cliff)
    const vested = await simpleLockup.vestedAmount();
    expect(vested).to.be.gt(0);
    console.log(`  ✅ Vesting after cliff: ${ethers.formatEther(vested)} tokens`);
  });

  it('Should prevent duplicate lockup creation', async function () {
    await simpleLockup.createLockup(beneficiary.address, TOTAL_AMOUNT, 0, 12 * MONTH, true);

    console.log('✅ First lockup created');

    await expect(
      simpleLockup.createLockup(beneficiary.address, TOTAL_AMOUNT, 0, 12 * MONTH, true)
    ).to.be.revertedWithCustomError(simpleLockup, 'LockupAlreadyExists');

    console.log('✅ Duplicate lockup correctly prevented');
  });

  it('Should handle zero releasable amount correctly', async function () {
    await simpleLockup.createLockup(
      beneficiary.address,
      TOTAL_AMOUNT,
      6 * MONTH, // Cliff
      12 * MONTH,
      true
    );

    console.log('✅ Lockup created with cliff');

    // During cliff - should revert
    await expect(simpleLockup.connect(beneficiary).release()).to.be.revertedWithCustomError(
      simpleLockup,
      'NoTokensAvailable'
    );

    console.log('✅ Release correctly prevented during cliff');
  });

  it('Should release all remaining tokens at vesting end (rounding fix)', async function () {
    await simpleLockup.createLockup(beneficiary.address, TOTAL_AMOUNT, 0, 12 * MONTH, true);

    console.log('✅ Lockup created');

    // Fast forward to end
    await time.increase(12 * MONTH + 1);

    // Release all
    await simpleLockup.connect(beneficiary).release();

    const beneficiaryBalance = await token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance).to.equal(TOTAL_AMOUNT);

    console.log('✅ All tokens released (no rounding dust)');
    console.log(`  Balance: ${ethers.formatEther(beneficiaryBalance)} tokens`);
  });
});
