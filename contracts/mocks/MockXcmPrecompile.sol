// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * MockXcmPrecompile
 * ============================================================
 * Test double for the Polkadot Hub XCM precompile.
 * Deployed in Hardhat local environment to simulate XCM behavior.
 *
 * xcmSend     — Returns a deterministic mock messageId derived from
 *               the destination and message content. Emits XcmSent
 *               for test assertion. Can be configured to revert or
 *               return zero to test failure paths.
 *
 * xcmExecute  — Always returns 0 (Complete) by default.
 *               Set shouldFail = true to simulate execution failure.
 *
 * xcmQuery    — Returns an incrementing queryId. Stores the responder
 *               address. Test harness can call simulateQueryResponse
 *               to trigger the onQueryResponse callback on XCMDispatcher.
 *
 * Configurable failure modes allow testing:
 *   - XCM send failure (xcmMessageId returns zero)
 *   - XCM execution failure (non-zero outcome code)
 *   - Query timeout (no response delivered)
 * ============================================================
 */

import "../interfaces/IXcmPrecompile.sol";

contract MockXcmPrecompile is IXcmPrecompile {
    bool public shouldFailSend;
    bool public shouldFailExecute;
    uint32 public mockOutcomeCode;

    uint64 private _queryCounter;

    mapping(uint64 => address) public queryResponders;
    mapping(uint64 => bytes) public queryData;

    event XcmSent(bytes dest, bytes message, bytes32 messageId);
    event XcmExecuted(bytes message, uint64 maxWeight, uint32 outcome);
    event XcmQuerySent(uint64 queryId, bytes dest, address responder);

    function xcmSend(
        bytes calldata dest,
        bytes calldata message
    ) external override returns (bytes32 messageId) {
        if (shouldFailSend) return bytes32(0);

        messageId = keccak256(abi.encodePacked(dest, message, block.timestamp, msg.sender));

        emit XcmSent(dest, message, messageId);
        return messageId;
    }

    function xcmExecute(
        bytes calldata message,
        uint64 maxWeight
    ) external override returns (uint32 outcome) {
        if (shouldFailExecute) return mockOutcomeCode == 0 ? 1 : mockOutcomeCode;

        emit XcmExecuted(message, maxWeight, 0);
        return 0;
    }

    function xcmQuery(
        bytes calldata dest,
        bytes calldata data,
        address responder,
        uint64
    ) external override returns (uint64 queryId) {
        queryId = ++_queryCounter;
        queryResponders[queryId] = responder;
        queryData[queryId] = data;

        emit XcmQuerySent(queryId, dest, responder);
        return queryId;
    }

    function simulateQueryResponse(uint64 queryId, bytes calldata responseData) external {
        address responder = queryResponders[queryId];
        require(responder != address(0), "MockXcm: unknown queryId");

        (bool success, ) = responder.call(
            abi.encodeWithSignature("onQueryResponse(uint64,bytes)", queryId, responseData)
        );
        require(success, "MockXcm: onQueryResponse callback failed");
    }

    function setShouldFailSend(bool _fail) external {
        shouldFailSend = _fail;
    }

    function setShouldFailExecute(bool _fail, uint32 _code) external {
        shouldFailExecute = _fail;
        mockOutcomeCode = _code;
    }
}
