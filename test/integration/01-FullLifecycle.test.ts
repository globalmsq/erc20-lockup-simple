import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { SimpleLockup, MockERC20 } from '../../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

/**
 * Integration Test: Full Vesting Lifecycle
 * Tests complete vesting cycle from creation to 100% release
 */
describe('Integration: Full Vesting Lifecycle', function () {
  let simpleLockup: SimpleLockup;
  let token: MockERC20;
  let beneficiary: SignerWithAddress;
  let initialSnapshot: string;

  const MONTH = 1; // 1 second = 1 month for accelerated testing
  const TOTAL_MONTHS = 100; // 100 months total vesting
  const TOTAL_AMOUNT = ethers.parseEther('100000'); // 100k tokens

  before(async function () {
    initialSnapshot = await ethers.provider.send('evm_snapshot', []);
  });

  beforeEach(async function () {
    await ethers.provider.send('evm_revert', [initialSnapshot]);
    initialSnapshot = await ethers.provider.send('evm_snapshot', []);

    const [_owner, _beneficiary] = await ethers.getSigners();
    beneficiary = _beneficiary;

    const MockERC20Factory = await ethers.getContractFactory('MockERC20');
    token = await MockERC20Factory.deploy('SUT Token', 'SUT', ethers.parseEther('1000000'));
    await token.waitForDeployment();

    const SimpleLockupFactory = await ethers.getContractFactory('SimpleLockup');
    simpleLockup = await SimpleLockupFactory.deploy(await token.getAddress());
    await simpleLockup.waitForDeployment();

    await token.approve(await simpleLockup.getAddress(), TOTAL_AMOUNT);
  });

  describe('Complete Vesting Cycle', function () {
    it('Should complete full vesting lifecycle from 0% to 100%', async function () {
      await simpleLockup.createLockup(
        beneficiary.address,
        TOTAL_AMOUNT,
        0, // No cliff
        TOTAL_MONTHS * MONTH,
        true
      );

      console.log('✅ Lockup created');
      console.log(`  Total Amount: ${ethers.formatEther(TOTAL_AMOUNT)} tokens`);

      // Verify initial state
      expect(await simpleLockup.vestedAmount(beneficiary.address)).to.equal(0);
      expect(await simpleLockup.releasableAmount(beneficiary.address)).to.equal(0);

      // Test at 25% vested
      await time.increase(25 * MONTH);
      const vested25 = await simpleLockup.vestedAmount(beneficiary.address);
      const expected25 = (TOTAL_AMOUNT * 25n) / 100n;
      expect(vested25).to.be.closeTo(expected25, ethers.parseEther('2000'));

      console.log(`\n📊 25% Vested:`);
      console.log(`  Expected: ${ethers.formatEther(expected25)} tokens`);
      console.log(`  Actual: ${ethers.formatEther(vested25)} tokens`);

      await simpleLockup.connect(beneficiary).release();
      expect(await token.balanceOf(beneficiary.address)).to.be.closeTo(
        expected25,
        ethers.parseEther('2000')
      );

      // Test at 50% vested
      await time.increase(25 * MONTH);
      const vested50 = await simpleLockup.vestedAmount(beneficiary.address);
      const expected50 = (TOTAL_AMOUNT * 50n) / 100n;
      expect(vested50).to.be.closeTo(expected50, ethers.parseEther('2000'));

      console.log(`\n📊 50% Vested:`);
      console.log(`  Expected: ${ethers.formatEther(expected50)} tokens`);

      // Test at 75% vested
      await time.increase(25 * MONTH);
      const vested75 = await simpleLockup.vestedAmount(beneficiary.address);
      const expected75 = (TOTAL_AMOUNT * 75n) / 100n;
      expect(vested75).to.be.closeTo(expected75, ethers.parseEther('2000'));

      console.log(`\n📊 75% Vested:`);
      console.log(`  Expected: ${ethers.formatEther(expected75)} tokens`);

      // Test at 100% vested
      await time.increase(25 * MONTH);
      const vested100 = await simpleLockup.vestedAmount(beneficiary.address);
      expect(vested100).to.equal(TOTAL_AMOUNT);

      console.log(`\n📊 100% Vested:`);
      console.log(`  Expected: ${ethers.formatEther(TOTAL_AMOUNT)} tokens`);

      // Release all remaining tokens
      await simpleLockup.connect(beneficiary).release();
      expect(await token.balanceOf(beneficiary.address)).to.equal(TOTAL_AMOUNT);

      console.log('\n✅ Full lifecycle completed successfully');
    });
  });
});
