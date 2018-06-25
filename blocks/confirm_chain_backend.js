const asyncAuto = require('async/auto');

const {getBlockHeader} = require('./../chain');
const {getCurrentHash} = require('./../chain');
const {returnResult} = require('./../async-util');

const staleBlockMs = 1000 * 60 * 60 * 6;

/** Confirm that a chain backend is connected

  If the median time of the chain exceeds a stale block timer, or there is no
  chain tip, the chain backend confirmation will fail with an error.

  {
    network: <Network Name String>
  }
*/
module.exports = ({network}, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!network) {
        return cbk([400, 'ExpectedNetworkForChainConfirmation']);
      }

      return cbk();
    },

    // Get the chain tip
    getChainTipHash: ['validate', ({}, cbk) => getCurrentHash({network}, cbk)],

    // Get header info
    getHeaderInfo: ['getChainTipHash', ({getChainTipHash}, cbk) => {
      const block = getChainTipHash.hash;

      if (!block) {
        return cbk([503, 'ExpectedCurrentChainTipBlockHash']);
      }

      return getBlockHeader({block, network}, cbk);
    }],

    // Check header info
    checkHeaderInfo: ['getHeaderInfo', ({getHeaderInfo}, cbk) => {
      // Roughly how long has it been since this block was created?
      const delayMs = Date.now() - Date.parse(getHeaderInfo.median_created_at);

      if (delayMs > staleBlockMs) {
        return cbk([503, 'StaleRemoteBlockTime', delayMs]);
      }

      return cbk();
    }],
  },
  returnResult({}, cbk));
};

