import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { SimpleLockup, MockERC20 } from '../../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

/**
 * Integration Test: Periodic Release
 * Tests multiple releases during vesting period
 */
describe('Integration: Periodic Release', function () {
  let simpleLockup: SimpleLockup;
  let token: MockERC20;
  let beneficiary: SignerWithAddress;
  let initialSnapshot: string;

  const MONTH = 30 * 24 * 60 * 60; // 30 days
  const VESTING_DURATION = 12 * MONTH; // 12 months
  const TOTAL_AMOUNT = ethers.parseEther('12000'); // 12k tokens (1k per month)

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

  it('Should handle monthly releases correctly', async function () {
    await simpleLockup.createLockup(
      beneficiary.address,
      TOTAL_AMOUNT,
      0, // No cliff
      VESTING_DURATION,
      true
    );

    console.log('✅ Lockup created for monthly releases');
    console.log(`  Total: ${ethers.formatEther(TOTAL_AMOUNT)} tokens over 12 months`);

    let totalReleased = 0n;

    // Release every month for 12 months
    for (let month = 1; month <= 12; month++) {
      await time.increase(MONTH);

      const releasable = await simpleLockup.releasableAmount();
      if (releasable > 0n) {
        await simpleLockup.connect(beneficiary).release();
        totalReleased += releasable;

        console.log(`\n📅 Month ${month}:`);
        console.log(`  Released: ${ethers.formatEther(releasable)} tokens`);
        console.log(`  Total Released: ${ethers.formatEther(totalReleased)} tokens`);
      }
    }

    // Verify all tokens released
    expect(await token.balanceOf(beneficiary.address)).to.equal(TOTAL_AMOUNT);
    console.log('\n✅ All tokens released successfully');
  });
});
