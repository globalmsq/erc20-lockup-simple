import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { SimpleLockup, MockERC20 } from '../../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

/**
 * Integration Test: Revocation Scenarios
 * Tests lockup revocation functionality
 */
describe('Integration: Revocation Scenarios', function () {
  let simpleLockup: SimpleLockup;
  let token: MockERC20;
  let owner: SignerWithAddress;
  let beneficiary: SignerWithAddress;
  let initialSnapshot: string;

  const MONTH = 30 * 24 * 60 * 60; // 30 days
  const VESTING_DURATION = 12 * MONTH; // 12 months
  const TOTAL_AMOUNT = ethers.parseEther('12000'); // 12k tokens

  before(async function () {
    initialSnapshot = await ethers.provider.send('evm_snapshot', []);
  });

  beforeEach(async function () {
    await ethers.provider.send('evm_revert', [initialSnapshot]);
    initialSnapshot = await ethers.provider.send('evm_snapshot', []);

    [owner, beneficiary] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory('MockERC20');
    token = await MockERC20Factory.deploy('SUT Token', 'SUT', ethers.parseEther('1000000'));
    await token.waitForDeployment();

    const SimpleLockupFactory = await ethers.getContractFactory('SimpleLockup');
    simpleLockup = await SimpleLockupFactory.deploy(await token.getAddress());
    await simpleLockup.waitForDeployment();

    await token.approve(await simpleLockup.getAddress(), TOTAL_AMOUNT * 2n);
  });

  it('Should revoke lockup and return unvested tokens', async function () {
    await simpleLockup.createLockup(
      beneficiary.address,
      TOTAL_AMOUNT,
      0,
      VESTING_DURATION,
      true // Revocable
    );

    console.log('✅ Revocable lockup created');

    // Fast forward to 50% vesting
    await time.increase(VESTING_DURATION / 2);

    const vestedBefore = await simpleLockup.vestedAmount();
    console.log(`\n📊 50% vested: ${ethers.formatEther(vestedBefore)} tokens`);

    const ownerBalanceBefore = await token.balanceOf(owner.address);

    // Revoke lockup
    await simpleLockup.revoke();

    const lockup = await simpleLockup.lockupInfo();
    expect(lockup.revoked).to.equal(true);
    expect(lockup.vestedAtRevoke).to.be.closeTo(vestedBefore, ethers.parseEther('0.1'));

    // Owner should receive unvested tokens
    const ownerBalanceAfter = await token.balanceOf(owner.address);
    const returned = ownerBalanceAfter - ownerBalanceBefore;

    console.log(`\n💰 Tokens returned to owner: ${ethers.formatEther(returned)}`);
    expect(returned).to.be.closeTo(TOTAL_AMOUNT - vestedBefore, ethers.parseEther('100'));

    // Beneficiary can still claim vested tokens
    await simpleLockup.connect(beneficiary).release();
    expect(await token.balanceOf(beneficiary.address)).to.be.closeTo(
      vestedBefore,
      ethers.parseEther('0.1')
    );

    console.log('✅ Revocation completed successfully');
  });

  it('Should not allow revoking non-revocable lockup', async function () {
    await simpleLockup.createLockup(
      beneficiary.address,
      TOTAL_AMOUNT,
      0,
      VESTING_DURATION,
      false // Non-revocable
    );

    console.log('✅ Non-revocable lockup created');

    await expect(simpleLockup.revoke()).to.be.revertedWithCustomError(simpleLockup, 'NotRevocable');

    console.log('✅ Non-revocable lockup correctly protected');
  });

  it('Beneficiary can release before owner revokes (intended behavior)', async function () {
    await simpleLockup.createLockup(
      beneficiary.address,
      TOTAL_AMOUNT,
      0,
      VESTING_DURATION,
      true // Revocable
    );

    console.log('✅ Revocable lockup created');

    // Fast forward to 50% vesting
    await time.increase(VESTING_DURATION / 2);

    const vestedBefore = await simpleLockup.vestedAmount();
    console.log(`\n📊 50% vested: ${ethers.formatEther(vestedBefore)} tokens`);

    // Beneficiary releases BEFORE owner revokes (this is acceptable)
    await simpleLockup.connect(beneficiary).release();
    const beneficiaryBalance = await token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance).to.be.closeTo(vestedBefore, ethers.parseEther('0.1'));

    console.log(
      `\n💰 Beneficiary claimed before revocation: ${ethers.formatEther(beneficiaryBalance)} tokens`
    );

    // Owner revokes AFTER beneficiary already claimed (should still succeed)
    await expect(simpleLockup.revoke()).to.not.be.reverted;

    const lockup = await simpleLockup.lockupInfo();
    expect(lockup.revoked).to.equal(true);

    // Verify lockup is revoked and vesting is frozen
    const releasableAfterRevoke = await simpleLockup.releasableAmount();
    // Releasable amount should be minimal (time passed during transactions)
    expect(releasableAfterRevoke).to.be.lt(ethers.parseEther('100')); // Less than 100 tokens

    console.log(
      `\n📊 Releasable after revoke: ${ethers.formatEther(releasableAfterRevoke)} tokens (minimal)`
    );
    console.log('✅ Revocation succeeded even after beneficiary claimed (intended behavior)');
    console.log("   This is NOT a front-running vulnerability - it's fair usage");
  });

  it('Should return all tokens to owner when revoked during cliff period', async function () {
    const CLIFF_DURATION = 3 * MONTH; // 3 months cliff

    await simpleLockup.createLockup(
      beneficiary.address,
      TOTAL_AMOUNT,
      CLIFF_DURATION,
      VESTING_DURATION,
      true // Revocable
    );

    console.log('✅ Lockup with cliff created');
    console.log(`  Cliff Duration: ${CLIFF_DURATION / (30 * 24 * 60 * 60)} months`);

    const ownerBalanceBefore = await token.balanceOf(owner.address);

    // Fast forward to middle of cliff period (1.5 months)
    await time.increase(CLIFF_DURATION / 2);

    // Verify no tokens vested during cliff
    const vestedDuringCliff = await simpleLockup.vestedAmount();
    expect(vestedDuringCliff).to.equal(0);
    console.log('\n📊 Vested during cliff: 0 tokens (correct)');

    // Revoke during cliff period
    await simpleLockup.revoke();

    const lockup = await simpleLockup.lockupInfo();
    expect(lockup.revoked).to.equal(true);
    expect(lockup.vestedAtRevoke).to.equal(0); // No tokens vested

    console.log('\n✅ Lockup revoked during cliff');
    console.log(`  Vested at revoke: ${ethers.formatEther(lockup.vestedAtRevoke)} tokens`);

    // Owner should receive full amount back
    const ownerBalanceAfter = await token.balanceOf(owner.address);
    const returned = ownerBalanceAfter - ownerBalanceBefore;
    expect(returned).to.equal(TOTAL_AMOUNT);

    console.log(`\n💰 Tokens returned to owner: ${ethers.formatEther(returned)}`);
    console.log('   Owner received 100% of tokens (correct - no vesting during cliff)');

    // Beneficiary should not be able to claim anything
    await expect(simpleLockup.connect(beneficiary).release()).to.be.revertedWithCustomError(
      simpleLockup,
      'NoTokensAvailable'
    );

    console.log('\n✅ Cliff period revocation completed successfully');
    console.log('   Beneficiary cannot claim tokens (correct - nothing vested)');
  });
});
