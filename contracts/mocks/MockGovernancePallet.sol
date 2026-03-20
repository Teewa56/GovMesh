// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ============================================================
 * MockGovernancePallet
 * ============================================================
 * Simulates a remote parachain governance pallet for integration
 * testing of the XCM vote dispatch flow.
 *
 * In production, the Transact XCM instruction targets a Substrate
 * governance pallet on the remote parachain — a Rust module, not
 * a Solidity contract. This mock simulates its behavior in the
 * Hardhat EVM environment for integration test assertions.
 *
 * vote         — Records a vote for a given proposal index.
 *               Called by the MockXcmPrecompile simulateTransact
 *               helper in integration tests.
 *
 * getVote      — Returns the vote submitted for a given voter
 *               and proposal. Used in test assertions to verify
 *               the XCM Transact payload was correctly encoded
 *               and would produce the right remote state change.
 *
 * Emits VoteReceived for test event log assertions.
 * ============================================================
 */

contract MockGovernancePallet {
    struct RemoteVote {
        address voter;
        uint256 proposalIndex;
        bool aye;
        bool abstain;
        uint8 conviction;
        uint256 timestamp;
    }

    mapping(uint256 => mapping(address => RemoteVote)) public votes;
    mapping(uint256 => bool) public openProposals;

    event VoteReceived(
        address indexed voter,
        uint256 indexed proposalIndex,
        bool aye,
        bool abstain,
        uint8 conviction
    );

    function openProposal(uint256 index) external {
        openProposals[index] = true;
    }

    function closeProposal(uint256 index) external {
        openProposals[index] = false;
    }

    function vote(
        uint256 proposalIndex,
        bool aye,
        bool abstain,
        uint8 conviction
    ) external {
        require(openProposals[proposalIndex], "MockPallet: proposal not open");

        votes[proposalIndex][msg.sender] = RemoteVote({
            voter: msg.sender,
            proposalIndex: proposalIndex,
            aye: aye,
            abstain: abstain,
            conviction: conviction,
            timestamp: block.timestamp
        });

        emit VoteReceived(msg.sender, proposalIndex, aye, abstain, conviction);
    }

    function getVote(uint256 proposalIndex, address voter) external view returns (RemoteVote memory) {
        return votes[proposalIndex][voter];
    }
}
