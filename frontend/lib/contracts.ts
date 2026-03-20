/*
 * contracts.ts
 * Contract addresses and ABIs for GovMesh.
 * ABI includes only the functions needed by the frontend.
 */

export const CONTRACT_ADDRESSES = {
  registry: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  voting: (process.env.NEXT_PUBLIC_VOTING_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  dispatcher: (process.env.NEXT_PUBLIC_DISPATCHER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
};

export const REGISTRY_ABI = [
    {
      "inputs": [],
      "name": "InvalidParachainId",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidXcmLocation",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "id",
          "type": "uint32"
        }
      ],
      "name": "ParachainAlreadyRegistered",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "id",
          "type": "uint32"
        }
      ],
      "name": "ParachainInactive",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "id",
          "type": "uint32"
        }
      ],
      "name": "ParachainNotFound",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        }
      ],
      "name": "ProposalNotFound",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "caller",
          "type": "address"
        }
      ],
      "name": "UnauthorizedCaller",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "previousAdmin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "newAdmin",
          "type": "address"
        }
      ],
      "name": "AdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "beacon",
          "type": "address"
        }
      ],
      "name": "BeaconUpgraded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "version",
          "type": "uint8"
        }
      ],
      "name": "Initialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "id",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "ParachainDeactivated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "id",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "ParachainRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "ProposalClosed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "ProposalSynced",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint64",
          "name": "queryId",
          "type": "uint64"
        },
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        }
      ],
      "name": "QueryDispatched",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "previousAdminRole",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "newAdminRole",
          "type": "bytes32"
        }
      ],
      "name": "RoleAdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "implementation",
          "type": "address"
        }
      ],
      "name": "Upgraded",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "DEFAULT_ADMIN_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DISPATCHER_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_PARACHAINS",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_PROPOSALS_PER_PARACHAIN",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "SYNCER_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "UPGRADER_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "id",
          "type": "uint32"
        }
      ],
      "name": "deactivateParachain",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "dispatcher",
      "outputs": [
        {
          "internalType": "contract IXCMDispatcher",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getActiveParachains",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint32",
              "name": "id",
              "type": "uint32"
            },
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "bytes",
              "name": "xcmLocation",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "govPalletEncoded",
              "type": "bytes"
            },
            {
              "internalType": "bool",
              "name": "active",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "registeredAt",
              "type": "uint256"
            }
          ],
          "internalType": "struct IGovMeshRegistry.Parachain[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "id",
          "type": "uint32"
        }
      ],
      "name": "getParachain",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint32",
              "name": "id",
              "type": "uint32"
            },
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "bytes",
              "name": "xcmLocation",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "govPalletEncoded",
              "type": "bytes"
            },
            {
              "internalType": "bool",
              "name": "active",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "registeredAt",
              "type": "uint256"
            }
          ],
          "internalType": "struct IGovMeshRegistry.Parachain",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        }
      ],
      "name": "getProposal",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "index",
              "type": "uint256"
            },
            {
              "internalType": "uint32",
              "name": "parachainId",
              "type": "uint32"
            },
            {
              "internalType": "string",
              "name": "title",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "metadataIpfsHash",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "endBlock",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "ayeVotes",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nayVotes",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "abstainVotes",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "open",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "lastSyncedAt",
              "type": "uint256"
            }
          ],
          "internalType": "struct IGovMeshRegistry.Proposal",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        }
      ],
      "name": "getProposals",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "index",
              "type": "uint256"
            },
            {
              "internalType": "uint32",
              "name": "parachainId",
              "type": "uint32"
            },
            {
              "internalType": "string",
              "name": "title",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "metadataIpfsHash",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "endBlock",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "ayeVotes",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nayVotes",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "abstainVotes",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "open",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "lastSyncedAt",
              "type": "uint256"
            }
          ],
          "internalType": "struct IGovMeshRegistry.Proposal[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        }
      ],
      "name": "getRoleAdmin",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "grantRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "hasRole",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "admin",
          "type": "address"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        }
      ],
      "name": "isProposalOpen",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint64",
          "name": "queryId",
          "type": "uint64"
        },
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "internalType": "bytes",
          "name": "responseData",
          "type": "bytes"
        }
      ],
      "name": "onQueryResponse",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "proxiableUUID",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "id",
          "type": "uint32"
        },
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "bytes",
          "name": "xcmLocation",
          "type": "bytes"
        },
        {
          "internalType": "bytes",
          "name": "govPalletEncoded",
          "type": "bytes"
        }
      ],
      "name": "registerParachain",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "renounceRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "revokeRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "dispatcherAddress",
          "type": "address"
        }
      ],
      "name": "setDispatcher",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        }
      ],
      "name": "syncProposals",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        }
      ],
      "name": "upgradeTo",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "upgradeToAndCall",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "index",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "metadataIpfsHash",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "endBlock",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "ayeVotes",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nayVotes",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "abstainVotes",
          "type": "uint256"
        }
      ],
      "name": "writeProposal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const;

export const VOTING_ABI = [
  {
      "inputs": [
        {
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        }
      ],
      "name": "AlreadyVoted",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "voteId",
          "type": "bytes32"
        }
      ],
      "name": "DispatchFailed",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "balance",
          "type": "uint256"
        }
      ],
      "name": "InsufficientDotBalance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "conviction",
          "type": "uint8"
        }
      ],
      "name": "InvalidConviction",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidVoteType",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        }
      ],
      "name": "ProposalNotOpen",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ZeroVotingWeight",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "previousAdmin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "newAdmin",
          "type": "address"
        }
      ],
      "name": "AdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "beacon",
          "type": "address"
        }
      ],
      "name": "BeaconUpgraded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "version",
          "type": "uint8"
        }
      ],
      "name": "Initialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "previousAdminRole",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "newAdminRole",
          "type": "bytes32"
        }
      ],
      "name": "RoleAdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "implementation",
          "type": "address"
        }
      ],
      "name": "Upgraded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "voteId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum IGovMeshVoting.VoteType",
          "name": "voteType",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "conviction",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "votingWeight",
          "type": "uint256"
        }
      ],
      "name": "VoteCommitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "voteId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        }
      ],
      "name": "VoteDelivered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "voteId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "VoteFailed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "voteId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "xcmMessageId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        }
      ],
      "name": "VoteSent",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "CONFIRMER_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_ADMIN_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_FEE_PLANCK",
      "outputs": [
        {
          "internalType": "uint128",
          "name": "",
          "type": "uint128"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_VOTE_DISPATCH_WEIGHT",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_VOTE_PROOF_SIZE",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "UPGRADER_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "XCM_NATIVE_ASSETS_PRECOMPILE",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "voteId",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "xcmMessageId",
          "type": "bytes32"
        }
      ],
      "name": "confirmDelivery",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "dispatcher",
      "outputs": [
        {
          "internalType": "contract IXCMDispatcher",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        }
      ],
      "name": "getProposalTally",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "aye",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nay",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "abstain",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        }
      ],
      "name": "getRoleAdmin",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "voteId",
          "type": "bytes32"
        }
      ],
      "name": "getVote",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "voteId",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "voter",
              "type": "address"
            },
            {
              "internalType": "uint32",
              "name": "parachainId",
              "type": "uint32"
            },
            {
              "internalType": "uint256",
              "name": "proposalIndex",
              "type": "uint256"
            },
            {
              "internalType": "enum IGovMeshVoting.VoteType",
              "name": "voteType",
              "type": "uint8"
            },
            {
              "internalType": "uint8",
              "name": "conviction",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "dotBalance",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "votingWeight",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "enum IGovMeshVoting.DeliveryStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "xcmMessageId",
              "type": "bytes32"
            }
          ],
          "internalType": "struct IGovMeshVoting.VoteRecord",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "voter",
          "type": "address"
        }
      ],
      "name": "getVoteHistory",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "voteId",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "voter",
              "type": "address"
            },
            {
              "internalType": "uint32",
              "name": "parachainId",
              "type": "uint32"
            },
            {
              "internalType": "uint256",
              "name": "proposalIndex",
              "type": "uint256"
            },
            {
              "internalType": "enum IGovMeshVoting.VoteType",
              "name": "voteType",
              "type": "uint8"
            },
            {
              "internalType": "uint8",
              "name": "conviction",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "dotBalance",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "votingWeight",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "enum IGovMeshVoting.DeliveryStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "xcmMessageId",
              "type": "bytes32"
            }
          ],
          "internalType": "struct IGovMeshVoting.VoteRecord[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "grantRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "hasRole",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        }
      ],
      "name": "hasVoted",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "registryAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "dispatcherAddress",
          "type": "address"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "voteId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "markFailed",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "minimumDotBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nativeAssets",
      "outputs": [
        {
          "internalType": "contract INativeAssets",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "proxiableUUID",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "registry",
      "outputs": [
        {
          "internalType": "contract IGovMeshRegistry",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "renounceRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "revokeRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "dispatcherAddress",
          "type": "address"
        }
      ],
      "name": "setDispatcher",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "setMinimumDotBalance",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "nativeAssetsAddress",
          "type": "address"
        }
      ],
      "name": "setNativeAssets",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "registryAddress",
          "type": "address"
        }
      ],
      "name": "setRegistry",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        }
      ],
      "name": "upgradeTo",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "upgradeToAndCall",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "parachainId",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "proposalIndex",
          "type": "uint256"
        },
        {
          "internalType": "enum IGovMeshVoting.VoteType",
          "name": "voteType",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "conviction",
          "type": "uint8"
        }
      ],
      "name": "vote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
] as const;

export const ONE_DOT = 10_000_000_000n;

export function formatDot(planck: bigint): string {
  const dot = planck / ONE_DOT;
  const rem = planck % ONE_DOT;
  const decimals = rem.toString().padStart(10, "0").slice(0, 2);
  return `${dot.toLocaleString()}.${decimals} DOT`;
}

export function formatDotShort(planck: bigint): string {
  const dot = Number(planck) / Number(ONE_DOT);
  if (dot >= 1_000_000) return `${(dot / 1_000_000).toFixed(1)}M DOT`;
  if (dot >= 1_000) return `${(dot / 1_000).toFixed(1)}K DOT`;
  return `${dot.toFixed(2)} DOT`;
}

export const VOTE_TYPE = { Aye: 0, Nay: 1, Abstain: 2 } as const;
export const DELIVERY_STATUS = { Pending: 0, Sent: 1, Delivered: 2, Failed: 3 } as const;

export const CONVICTION_LABELS: Record<number, string> = {
  0: "0.1×  — No lock",
  1: "1×    — 1 period",
  2: "2×    — 2 periods",
  3: "3×    — 4 periods",
  4: "4×    — 8 periods",
  5: "5×    — 16 periods",
  6: "6×    — 32 periods",
};

export const PARACHAIN_COLORS: Record<number, string> = {
  2004: "#53CBC9",
  2006: "#0085FF",
  2034: "#A855F7",
};

export const PARACHAIN_NAMES: Record<number, string> = {
  2004: "Moonbeam",
  2006: "Astar",
  2034: "Hydration",
};
