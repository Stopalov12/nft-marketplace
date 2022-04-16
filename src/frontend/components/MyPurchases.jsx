import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Row, Col, Card } from "react-bootstrap";

const MyPurchases = ({ marketplace, nft, account }) => {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const loadPurchasedItems = async () => {

    //Fetch purchased items from marketplace by quering Offered events with the buyer set as a user
    const filter = marketplace.filters.Bought(null,null,null,null,null,account)
    const results = await marketplace.queryFilter(filter)
    const purchases= await Promise.all(results.map(async i=>{
      i=i.args
      //get uri url from the nft contract
      const uri = await nft.tokenURI(i.tokenId)

      const response= await fetch(uri)
      const metadata = await response.json()
      const totalPrice = await marketplace.getTotalPrice(i.itemId)
      let purchasedItem = {
     totalPrice,
     price:i.price,
     itemId:i.itemId,
     name:metadata.name,
     description: metadata.description,
     image:metadata.image

      }
      return purchasedItem
    }))
    setLoading(false)
    setPurchases(purchases)
  };
  useEffect(() => {
    loadPurchasedItems();
  }, []);
  if (loading) {
    return (
      <div style={{ padding: "1rem 0" }}>
        <h2>Loading...</h2>
      </div>
    );
  }
  return <div className="flex justify-center">
    {purchases.length>0?(<div className="px-5 container">
<Row xs={1} md={2} lg={4} className="g-4 py-5">
  {purchases.map((item,idx)=>(<Col key={idx} className='overflow hidden'>
    <Card>
      <Card.Img variant='top' src={item.image}/>
      <Card.Footer>{ethers.utils.formatEther(item.totalPrice)}ETH</Card.Footer>
    </Card>
  </Col>))}
</Row>
    </div>):(<main style={{padding:'1rem 0'}}>
      <h2>No purchases</h2>
    </main>)}
  </div>;
};

export default MyPurchases;
