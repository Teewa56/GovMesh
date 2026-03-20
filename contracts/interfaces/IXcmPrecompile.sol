// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * IXcmPrecompile
 * ============================================================
 * Interface for the Polkadot Hub XCM precompile deployed at
 * address 0x0000000000000000000000000000000000000800.
 *
 * This precompile is a native Polkadot Hub system contract that
 * exposes XCM v5 send and execute functionality to Solidity.
 *
 * xcmExecute  — Executes an XCM message locally on Polkadot Hub.
 *               Returns an outcome code: 0 = Complete, non-zero = error.
 *               maxWeight is the upper bound on ref_time computation units.
 *
 * xcmSend     — Dispatches an XCM message to a remote destination
 *               encoded as a SCALE-encoded MultiLocation byte array.
 *               Returns a bytes32 message ID that can be used to track
 *               delivery status via XCM query responses.
 *
 * xcmQuery    — Sends an XCM query to a remote destination to read
 *               state. The query response is delivered asynchronously
 *               to a designated responder contract address.
 *               Returns a queryId that matches the incoming response.
 *
 * Security Notes:
 *   - Only callable from contracts with appropriate Hub permissions.
 *   - The precompile validates XCM message structure before dispatch.
 *   - Fee assets must be available in the calling contract's sovereign account.
 * ============================================================
 */

interface IXcmPrecompile {
    function xcmExecute(
        bytes calldata message,
        uint64 maxWeight
    ) external returns (uint32 outcome);

    function xcmSend(
        bytes calldata dest,
        bytes calldata message
    ) external returns (bytes32 messageId);

    function xcmQuery(
        bytes calldata dest,
        bytes calldata queryData,
        address responder,
        uint64 timeout
    ) external returns (uint64 queryId);
}
