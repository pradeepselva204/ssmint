import { ethers, utils, BigNumber } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import { providerOptions } from "./providerOptions"
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useState,useEffect } from 'react';
import keccak256 from 'keccak256';
import { Buffer } from "buffer/";
import { MerkleTree } from 'merkletreejs';
import Web3Modal from 'web3modal'
// import { getNFTs, useMoralis } from "react-moralis"
// import '../Components/MintPage.css'
// import { Tree } from '../Config/Tree.js';
import {StoneSquadAddress,NetworkID} from '../Config/config.js'
// import './AdminPage.css'
import StoneSquad from '../Contract/StoneSquad.json'
// window.Buffer = window.Buffer || Buffer;
let web3Modal
const MintPage = () =>{

    // const { Moralis } = useMoralis();
    const defaultState= {
        userAddress: null,
        network: null,
        networkConfig: 0,
        totalMinted: 0,
        maxSupply: 0,
        maxMintAmountPerTx: 1,
        signer:null,
        tokenPrice: BigNumber.from(0),
        isPaused: true,
        isWhitelistMintEnabled: false,
        isUserInWhitelist: false,
        mintAmount:1,
        merkleProofManualAddress: '',
        merkleProofManualAddressFeedbackMessage: null,
        errorMessage: null,
      };
    const [days, setDays] = useState("");
    const [hours, setHours] = useState("");
    const [minutes, setMinutes] = useState("");
    const [seconds, setSeconds] = useState("");
    const [state,setState] = useState(defaultState)
    const [connect,setConnect] = useState(false)
    const [nft,setNFT] = useState([])
    const [provider,setProvider] = useState(null)
    const canMint = () =>{
        // return !state.isPaused || canWhitelistMint();
        return true
    }
    const canWhitelistMint = ()=>{
        return state.isWhitelistMintEnabled
      }
    
    const connectWallet = async() =>{
        try{
            // console.log(web3Modal.cachedProvider)        
            const connection = await web3Modal.connect()
            console.log(connection)
            await setProvider(connection)
            // delay(100)
            await checkMetaMask()
        }catch(e){
            toast.error(e)
        }
    }
    const disconnectWallet = async () => {
        await web3Modal.clearCachedProvider();
        setState(defaultState)
        setConnect(false)
      }
    const checkMetaMask = async () =>{
        
        const browserProvider = await detectEthereumProvider()
        console.log(browserProvider)
        if(
            !browserProvider){
            toast.error("MetaMask Not Installed")
        }
        else{
            // setState({...state,browserProvider:browserProvider})
            let provider = new ethers.providers.Web3Provider(browserProvider);
            let contract
            const walletAccounts = await provider.listAccounts()
            if(walletAccounts.length === 0){
                toast.error("No Accounts Detected")
            }else{
                const network = await provider.getNetwork();
                const signer = provider.getSigner()
                console.log(network)
                
                if(network.chainId===NetworkID){
                    
                    contract = new ethers.Contract(StoneSquadAddress,StoneSquad.abi,signer)

                }else{
                    // setConnect(false)
                    contract = null   
                    toast.error("Connect to ETH Network") 
                    
                }
                console.log(contract)
                let perTx = 1
                let paused = true
                if(await (contract.paused()))
                {
                    perTx = 1
                    paused = true
                }
                else{
                    perTx = 5
                    paused = false
                }
                // {console.log((await (contract.getMinted())).toNumber())}
                setConnect(true)
                setState({
                    ...state,
                    signer:signer,
                    network: network,
                    userAddress: walletAccounts[0],
                    networkConfig: network.chainId,
                    contract: contract,
                    isPaused: paused,
                    isWhitelistMintEnabled: await (contract.whitelistMintEnabled()),
                    tokenPrice: await (contract.cost()),
                    maxMintAmountPerTx: perTx,
                    totalMinted: (await (contract.getMinted())).toNumber()
                  });  
                //   console.log(paused)
                //   console.log(state.tokenPrice)              
            }
        }
    }

    const whitelistTimer = () =>{
            let endTime = new Date("2022/08/03");
            let endTimeParse = Date.parse(endTime) / 1000
        let now = new Date();
        let nowParse = Date.parse(now) / 1000;
        // console.log(endTimeParse)
            let timeLeft = nowParse - endTimeParse;//endTimeParse - nowParse
        timeLeft = 119 - timeLeft;
        // console.log(timeLeft)
        if(timeLeft>0)
        {		
            
            let countdays = Math.floor(timeLeft / 86400);
            
            let counthours = Math.floor((timeLeft - countdays * 86400) / 3600);
            let countminutes = Math.floor(
            (timeLeft - countdays * 86400 - counthours * 3600) / 60
            );
            let countseconds = Math.floor(
            timeLeft - countdays * 86400 - counthours * 3600 - countminutes * 60
            );
            if (counthours < "10") {
            counthours = "0" + counthours;
            }
            if (countminutes < "10") {
            countminutes = "0" + countminutes;
            }
            if (countseconds < "10") {
            countseconds = "0" + countseconds;
            }
            setDays(countdays);
            setHours(counthours);
            setMinutes(countminutes);
            setSeconds(countseconds);
        }
    }

    const decrementMintAmount = () =>{
        console.log(state.mintAmount)
        setState({
            ...state,
            mintAmount: Math.max(1, state.mintAmount - 1),
          });
    }
    const incrementMintAmount = () =>{
        console.log(state.maxMintAmountPerTx)
        setState({
            ...state,
            mintAmount: Math.min(state.maxMintAmountPerTx, state.mintAmount + 1)
        })
    }
    const mint = async () =>{
        console.log(state.isPaused)
        if(!state.isPaused){
            await tokenMint()
        }
        console.log(state.isWhitelistMintEnabled)
        if(canWhitelistMint()){
            await whitelistMint()
        }
        
        if(state.isPaused && !canWhitelistMint())
        {
            // console.log("Here")
            toast.error("Sales not active")
        }
    }
    const tokenMint = async () =>{
        await checkMetaMask()
        console.log(state.mintAmount)
        await state.contract.mint(state.mintAmount, {value:state.tokenPrice.mul(state.mintAmount)});
    }    
    const whitelistMint = async () =>{
        await checkMetaMask()
        const addresses= [
            "0xD4058183C15b9a3FccD59f161A2345945dD93d11",
            "0x971C0a106D94De1a6A9E6E9c5d5086144d8a2186",
            "0x806687546d3eb695947ebb69B0ad7149145b3Aba",
            "0x4a17928e2913625476346195B4aa0E845028B90a",
            "0xB2dc8dAC8195B2F98805cBC481ad2C41CE5fA501",
            "0xE3FC30F156C46B545c0D33DF6aFBE4DC6426FE10",            
            "0xD4058183C15b9a3FccD59f161A2345945dD93d12",
            "0xD4058183C15b9a3FccD59f161A2345945dD93d13",
            "0xD4058183C15b9a3FccD59f161A2345945dD93d14",
            "0xD4058183C15b9a3FccD59f161A2345945dD93d15"
        ]
        const leaves = addresses.map(x=>keccak256(x))
        const tree = new MerkleTree(leaves,keccak256,{sortPairs:true})
        const buf2hex = x=> '0x' + x.toString('hex')
        console.log(buf2hex(tree.getRoot()))
        const leaf = keccak256("0xD4058183C15b9a3FccD59f161A2345945dD93d11")
        // const proof = tree.getHexProof(leaf).toString().replaceAll('\'', '').replaceAll(' ', '');
        const proof = tree.getHexProof(keccak256(state.userAddress))
        console.log(proof)
        const checkLeaf = tree.getLeafIndex(Buffer.from(keccak256(state.userAddress))) >=0
        if(checkLeaf){
            // console.log()
            // let amount = 
            // console.log(amount)
        //    await(state.contract.whitelistMint(amount,proof,{value:ethers.utils.parseUnits("0.001", 18)}))
           await(state.contract.whitelistMint(state.mintAmount,proof,{value:state.tokenPrice}))
        }
    }
    const getNFTs = async () =>{
        const options = {chain:"0x4",address:"0xD4058183C15b9a3FccD59f161A2345945dD93d11",token_address:"0x65EC956d1a4dDA184fa4cC8487c478C39E4B0DD7"}
        const NFTs = await Moralis.Web3.getNFTs(options)
        setNFT(NFTs)
        console.log(NFTs)

    }
    useEffect(() =>{
        web3Modal = new Web3Modal(
            {
            
                cacheProvider: true, // optional
                providerOptions // required
            
            }
        )
        setInterval(() => {
            whitelistTimer();
          }, 1000);  
    },[])

    return(
        <>
            {canMint() 
            ? 
                <>
                    <div className="bg">
                        <div className="mainlayout">
                            <div className='tickercontainer'>
                                <div className="tickercontainerbox">
                                    <div className='tickerdisplay'>
                                        <div className='tickerheader'>
                                            <div>
                                                <div className='tickerstatus'>
                                                    <div className='tickerstatustitle'>
                                                        Whitelist 
                                                        Minting
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ticker">
                                                Ends In
                                                <div className='tickerboxcontainer'>
                                                    <div className='tickerbox'>
                                                        <div className='tickerboxdisplay'>
                                                            <span>{days}</span>
                                                        </div>
                                                    </div>
                                                    <div className='tickerbox'>
                                                        <div className='tickerboxdisplay'>
                                                            <span>{hours}</span>
                                                        </div>
                                                    </div>
                                                    <div className='tickerbox'>
                                                        <div className='tickerboxdisplay'>
                                                            <span>{minutes}</span>
                                                        </div>
                                                    </div>
                                                    <div className='tickerbox'>
                                                        <div className='tickerboxdisplay'>
                                                            <span>{seconds}</span>
                                                        </div>
                                                    </div>                                                                                                                                                            
                                                </div>
                                            </div>                                            
                                        </div>
                                        <div className="tickernotification">
                                            <span>Max 1 Token</span>
                                            <b>*</b>
                                            <span>
                                                <div style={{display:"inline"}}>
                                                    Price 0.1 ETH
                                                </div>
                                            </span>
                                        </div>                                        
                                    </div>
                                </div>
                                <div className="tickercontainerbox">
                                    <div className='tickerdisplay'>
                                        <div className='tickerheader'>
                                            <div>
                                                <div className='tickerstatus'>
                                                    <div className='tickerstatustitle'>
                                                        Public Sale
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ticker">
                                                Starts In
                                                <div className='tickerboxcontainer'>
                                                    <div className='tickerbox'>                                                        
                                                        <div className='tickerboxdisplay'>
                                                            <span>{days+1}</span>
                                                        </div>
                                                    </div>
                                                    <div className='tickerbox'>                                                        
                                                        <div className='tickerboxdisplay'>
                                                            <span>{hours}</span>
                                                        </div>
                                                    </div>   
                                                    <div className='tickerbox'>                                                        
                                                        <div className='tickerboxdisplay'>
                                                            <span>{minutes}</span>
                                                        </div>
                                                    </div>
                                                    <div className='tickerbox'>                                                        
                                                        <div className='tickerboxdisplay'>
                                                            <span>{seconds}</span>
                                                        </div>
                                                    </div>                                                                                                                                                         
                                                    
                                                </div>
                                            </div>
                                        </div>
                                        <div className="tickernotification">
                                            <span>Max 5 Tokens</span>
                                            <b>*</b>
                                            <span>
                                                <div style={{display:"inline"}}>
                                                    Price 0.15 ETH
                                                </div>
                                            </span>
                                        </div>
                                    </div>
                                </div>      

                                {
                                    connect ? 
                                    
                                    <>
                                        <div className="tickercontainerbox">
                                            <div className='tickerdisplay'>
                                                <div className='tickerminted'>
                                                    Total Minted {state.totalMinted} / 4444
                                                </div>
                                            </div>
                                        </div>                
                                        <div className="tickercontainerbox">
                                            <div className='tickerdisplay'>
                                                <div className='tickerminted'>
                                                    Total Price:  {utils.formatEther(state.tokenPrice.mul(state.mintAmount))}
                                                </div>
                                            </div>
                                        </div>                                                                         
                                    </> : null
                                }    
                            </div>
                            {/* <div className="container">
                            <span className='headercounter'>Whitelist Minting in</span>
                                <div className="layout">
                                    <div className="counter">
                                        <p className="text">{days}</p>
                                        <span className='text'>Days</span>
                                    </div>
                                    <div className="counter">
                                        <p className="text">{hours}</p>
                                        <span className='text'>Hours</span>
                                    </div>
                                    <div className="counter">
                                        <p className="text">{minutes}</p>
                                        <span className='text'>Minutes</span>
                                    </div>    
                                    <div className="counter">
                                        <p className="text">{seconds}</p>
                                        <span className='text'>Seconds</span>
                                    </div>                                       
                                </div>
                            </div> */}
                            <div className="controlscontainer">

                                {/* <div className="mintcontainer">
                                <strong>Total price:</strong> 
                                <i>{utils.formatEther(state.tokenPrice.mul(state.mintAmount))} </i>
                                </div> */}

                                <div className="controls">
                                    <div className="secondary-button hero w-button">
                                        <button className="secondary-button" onClick={decrementMintAmount}>-</button>
                                        <span className="mintinput">
                                            {state.mintAmount} 
                                        </span>
                                        <button className="secondary-button" onClick={incrementMintAmount}>+</button>
                                    </div>
                                
                                </div>

                                {connect ? 
                                
                                <>
                                    <button className="primary-button hero w-button" onClick={mint}>Mint</button>
                                    <button className="primary-button hero w-button" onClick={disconnectWallet}>Disconnect Wallet</button>  
                                </>

                                :
                                    <>                                    
                                        <button className="primary-button hero w-button" onClick={connectWallet}>Connect Wallet</button>
                                        
                                    </>
                                }
                                {/* { nft!==[] ?
                                
                                <>
                                    <div>
                                
                                        <div className="stakecontainer">
                                        {nft.map((i,index)=>{
                                            return(
                                                <>                                                    
                                                    <div key={index} className="card">
                                                        <img src="https://www.w3schools.com/howto/img_avatar.png" alt="Avatar" />
                                                        <div className="stakeheading">
                                                            <h4><b>John Doe</b></h4> 
                                                            <p>Architect & Engineer</p> 
                                                        </div>
                                                    </div>
                                                
                                                </>
                                            )
                                        })}
                                        </div>
                                    </div> 
                                </>
                            
                                : null 
                                } */}
                                
                            </div>
                        </div>
                    </div>                    
                </>
        
            :
                <>
                </>
            }
            <ToastContainer/>
        </>
    )
}

export default MintPage