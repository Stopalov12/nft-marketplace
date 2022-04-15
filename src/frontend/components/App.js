import logo from "./logo.png";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ethers } from "ethers";
import { useState } from "react";
import MarketplaceAbi from "../contractsData/Marketplace.json";
import MarketplaceAddress from "../contractsData/Marketplace-address.json";
import NFTAbi from "../contractsData/NFT.json";
import NFTAddress from "../contractsData/NFT-address.json";

import Navigation from "./Navbar";
import Create from "./Create";
import Home from "./Home";
import MyListedItems from "./MyListedItems";
import MyPurchases from "./MyPurchases";
import { Nav, Spinner } from "react-bootstrap";

function App() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [nft, setNFT] = useState({});
  const [marketplace, setMarketplace] = useState({});
  const web3Handler = async () => {
    const account = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    setAccount(account[0]);
    //get provider from metamask
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    loadContracts(signer);
  };
  const loadContracts = async (signer) => {
    //get deployed copies from the contracts
    const marketplace = new ethers.Contract(
      MarketplaceAddress.address,
      MarketplaceAbi.abi,
      signer
    );
    setMarketplace(marketplace);
    const nft = new ethers.Contract(NFTAddress.address, NFTAbi.abi, signer);
    setNFT(nft);
    setLoading(false);
  };
  return (
    <BrowserRouter>
      <div>
        <Navigation web3Handler={web3Handler} account={account} />
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "80vh",
            }}
          >
            <Spinner animation="border" style={{ display: "flex" }} />
            <p className="mx-3 my-0">Awaiting Metamask connection...</p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Home marketplace={marketplace} nft={nft}/>} />
            <Route path="/create " />
            <Route path="/my-listed-items" />
            <Route path="/my-purchases" />
          </Routes>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
