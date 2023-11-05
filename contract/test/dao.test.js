const {ethers} = require('hardhat')
const {assert,expect, AssertionError} = require('chai')

describe("DAO",()=>{
    let provider,DAO
    beforeEach(async ()=>{
        provider = await ethers.getContractFactory("CeloDao")
        DAO = await provider.deploy()
    })

    it("deploys contract", async()=>{
        let contract =  await DAO.deployed()
        assert.notEqual(contract,'')
        assert.notEqual(contract,null)
        assert.notEqual(contract,undefined)
        assert.notEqual(contract,0x0)
    })

    describe("stakeholders and contributors", ()=>{
        it("stakeholder contributes and retrieves balance", async()=>{
            let price = new ethers.utils.parseEther('2');
            await DAO.contribute({value:price})
            let balance = await DAO.getStakeholdersBalances();
            assert.equal(balance,price.toString())
        })

        it("retrieves contributor balance", async()=>{
            let price = new ethers.utils.parseEther('1');
            await DAO.contribute({value:price})
            let balance = await DAO.getContributorsBalance();
            assert.equal(balance,price.toString())
        })

        it("collaborator contributes", async()=>{
            let price = new ethers.utils.parseEther('0.5');
            await DAO.contribute({value:price})
            let balance = await DAO.getContributorsBalance();
           assert.equal(balance,price.toString())
        })

        it("checks stakeholder status", async()=>{
            let [,stakeholder] = await ethers.getSigners()
            let price = new ethers.utils.parseEther('0.5');
            await DAO.connect(stakeholder).contribute({value : new ethers.utils.parseEther('2')})
            await DAO.contribute({value:price})
            let status = await DAO.stakeholderStatus()
            let stakeholderStatus = await DAO.connect(stakeholder).stakeholderStatus()
            assert.equal(status,false)
            assert.equal(stakeholderStatus,true)
        })
        it("checks contributors status", async()=>{
            let price = new ethers.utils.parseEther('0.5');
            await DAO.contribute({value:price})
            let status = await DAO.isContributor()
            assert.equal(status,true)
        })
    })
    

   

    describe("proposal", ()=>{
        it("creates proposal", async()=>{
            let [,beneficiary] = await ethers.getSigners()
            let price = new ethers.utils.parseEther('2');
            let amount = new ethers.utils.parseEther('10');
            await DAO.contribute({value:price})
            let proposal = await DAO.createProposal('title','desc',beneficiary.address,amount)
            const event = await proposal.wait().then((result) =>{
               return result.events.find((event) => event.event == 'ProposalAction')
            })
    
            assert.equal(event.args[2],'Proposal Raised')
            assert.equal(event.args[3],beneficiary.address)
            assert.equal(event.args[4],amount.toString())
        })

        it("retrieves proposal", async ()=>{
            let [,beneficiary,beneficiary2] = await ethers.getSigners()
            let price = new ethers.utils.parseEther('2');
            let amount = new ethers.utils.parseEther('10');
            await DAO.contribute({value:price})
            await DAO.createProposal('title','desc',beneficiary.address,amount)
            await DAO.createProposal('title','desc',beneficiary2.address,amount)
            let firstProposal = await DAO.getProposals(0)
            let secondProposal = await DAO.getProposals(1)
            expect(firstProposal.id.toString()).to.equal('0')
            expect(secondProposal.id.toString()).to.equal('1')
        })

        it("retrieves all proposals", async()=>{
            let [,beneficiary,beneficiary2] = await ethers.getSigners()
            let price = new ethers.utils.parseEther('2');
            let amount = new ethers.utils.parseEther('10');
            await DAO.contribute({value:price})
            await DAO.createProposal('title','desc',beneficiary.address,amount)
            await DAO.createProposal('title','desc',beneficiary2.address,amount)
            let proposals = await DAO.getAllProposals()
            const result = proposals.map((result)=> result)
            expect(result[0].id).to.equal(0)
            expect(result[1].id).to.equal(1)
        })

    })

    describe("voting",()=>{
        it("performs upvote", async()=>{
            let [,beneficiary] = await ethers.getSigners()
            let price = new ethers.utils.parseEther('2');
            let amount = new ethers.utils.parseEther('10');
            await DAO.contribute({value:price})
            await DAO.createProposal('title','desc',beneficiary.address,amount)
            let vote = await DAO.performVote(0,true)
            const events = await vote.wait().then((result)=>{
                return result.events.find((event)=> event.event == 'VoteAction')
            })
    
            expect(events.args[7]).to.equal(true)
            expect(events.args[4]).to.equal(amount)
            expect(events.args[3]).to.equal(beneficiary.address)
        })

        it("performs downvote", async()=>{
            let [,beneficiary] = await ethers.getSigners()
            let price = new ethers.utils.parseEther('2');
            let amount = new ethers.utils.parseEther('10');
            await DAO.contribute({value:price})
            await DAO.createProposal('title','desc',beneficiary.address,amount)
            let vote = await DAO.performVote(0,false)
            const events = await vote.wait().then((result)=>{
                return result.events.find((event)=> event.event == 'VoteAction')
            })
    
            expect(events.args[7]).to.equal(false)
            expect(events.args[4]).to.equal(amount)
            expect(events.args[3]).to.equal(beneficiary.address)
        })
        it("retrieves proposal vote", async ()=>{
            let [,beneficiary,voter] = await ethers.getSigners()
            let price = new ethers.utils.parseEther('2');
            let amount = new ethers.utils.parseEther('10');
            await DAO.connect(voter).contribute({value:price})
            await DAO.connect(voter).createProposal('title','desc',beneficiary.address,amount)
            await DAO.connect(voter).performVote(0,true)
            let vote =  await DAO.getProposalVote(0)
            assert.equal(vote[0].voter,voter.address)
        })
    })

    it("pays beneficiary", async()=>{
        let previousBalance,currentBalance
        let [,beneficiary,stakeholder] = await ethers.getSigners()
        let price = new ethers.utils.parseEther('5');
        let amount = new ethers.utils.parseEther('1');
        await DAO.contribute({value:price})
        await DAO.connect(stakeholder).contribute({value:price})
        await DAO.createProposal('title','desc',beneficiary.address,amount)
        await DAO.performVote(0,true)
        await DAO.connect(stakeholder).performVote(0,true)
        // const state = await DAO.
        await DAO.getTotalBalance().then((result)=>{
        previousBalance = result
        })
        const processPayment = await DAO.payBeneficiary(0)
        const events = await processPayment.wait().then((result)=>{
            return result.events.find((event)=> event.event == 'ProposalAction')
        })

        assert.equal(events.args[3],beneficiary.address)
        await DAO.getTotalBalance().then((result)=>{
            currentBalance = result
        })

        assert.equal(previousBalance.toString(),'10000000000000000000')
        assert.equal(currentBalance.toString(),'9000000000000000000')
    })
    
})