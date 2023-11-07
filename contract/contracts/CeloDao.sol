// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CeloDao is Ownable, ReentrancyGuard {
    // Contract state variables
    uint256 private totalProposals;
    uint256 private balance;
    address private deployer;

    // Immutable variables
    uint256 private immutable STAKEHOLDER_MIN_CONTRIBUTION = 0.1 ether;
    uint256 private immutable MIN_VOTE_PERIOD = 5 minutes;

    bytes32 private immutable COLLABORATOR_ROLE = keccak256("collaborator");
    bytes32 private immutable STAKEHOLDER_ROLE = keccak256("stakeholder");

    // Structs
    struct Proposal {
        uint256 id;
        uint256 amount;
        uint256 upVote;
        uint256 downVotes;
        uint256 duration;
        string title;
        string description;
        bool paid;
        bool passed;
        address payable beneficiary;
        address proposer;
        address executor;
    }

    struct Voted {
        address voter;
        uint256 timestamp;
        bool chosen;
    }

    // Mappings
    mapping(uint256 => Proposal) private proposals;
    mapping(address => uint256[]) private stakeholderVotes;
    mapping(uint256 => Voted[]) private votedOn;
    mapping(address => uint256) private contributions;
    mapping(address => uint256) private stakeholderBalances;

    // Events
    event ProposalCreated(
        address indexed creator,
        string title,
        address indexed beneficiary,
        uint256 amount
    );

    event VotedOnProposal(
        address indexed voter,
        string message,
        address indexed beneficiary,
        uint256 amount,
        uint256 upVote,
        uint256 downVotes,
        bool chosen
    );

    // Constructor
    constructor() {
        deployer = msg.sender;
    }

    // Function to create a proposal
    function createProposal(
        string calldata title,
        string calldata description,
        address beneficiary,
        uint256 amount
    ) external onlyRole(STAKEHOLDER_ROLE) returns (Proposal memory) {
        uint256 currentID = totalProposals++;
        Proposal storage newProposal = proposals[currentID];
        newProposal.id = currentID;
        newProposal.amount = amount;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.beneficiary = payable(beneficiary);
        newProposal.duration = block.timestamp + MIN_VOTE_PERIOD;

        emit ProposalCreated(msg.sender, title, beneficiary, amount);
        return newProposal;
    }

    // Function to vote on a proposal
    function voteOnProposal(uint256 proposalId, bool chosen) external onlyRole(STAKEHOLDER_ROLE) returns (Voted memory) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.duration > block.timestamp && !proposal.passed, "Proposal is expired or already passed");

        handleVoting(proposal);

        if (chosen) {
            proposal.upVote++;
        } else {
            proposal.downVotes++;
        }

        stakeholderVotes[msg.sender].push(proposalId);
        votedOn[proposalId].push(Voted(msg.sender, block.timestamp, chosen));

        emit VotedOnProposal(
            msg.sender,
            "Voted on Proposal",
            proposal.beneficiary,
            proposal.amount,
            proposal.upVote,
            proposal.downVotes,
            chosen
        );

        return Voted(msg.sender, block.timestamp, chosen);
    }

    // Function to handle voting
    function handleVoting(Proposal storage proposal) private {
        uint256[] memory tempVotes = stakeholderVotes[msg.sender];
        for (uint256 vote = 0; vote < tempVotes.length; vote++) {
            require(proposal.id != tempVotes[vote], "Already voted on this proposal");
        }
    }

    // Function to pay the beneficiary
    function payBeneficiary(uint256 proposalId) external onlyRole(STAKEHOLDER_ROLE) onlyOwner nonReentrant returns (uint256) {
        Proposal storage proposal = proposals[proposalId];
        require(balance >= proposal.amount, "Insufficient funds");
        require(!proposal.paid, "Payment already made");
        require(proposal.upVote > proposal.downVotes, "Insufficient votes to pass the proposal");

        _pay(proposal.amount, proposal.beneficiary);
        proposal.paid = true;
        proposal.executor = msg.sender;
        balance -= proposal.amount;

        emit ProposalCreated(msg.sender, "Payment successfully made", proposal.beneficiary, proposal.amount);

        return balance;
    }

    // Internal function to handle payments
    function _pay(uint256 amount, address to) private returns (bool) {
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "Payment failed");
        return true;
    }

    // Other contract functionalities...
}
